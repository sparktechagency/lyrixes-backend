import { USER_ROLES } from "../../../enums/user";
import { IUser, DRIVER_APPLICATION_STATUS } from "./user.interface";
import { JwtPayload } from "jsonwebtoken";
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import QueryBuilder from "../../builder/queryBuilder";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import { twilioService } from "../../../helpers/smsHelper";
import {
  PayoutStatus,
  RefundStatus,
  Transaction,
  TransactionStatus,
} from "../payment/transaction.model";
import { Types } from "mongoose";
import { Delivery } from "../delivery/delivery.model";
import { DELIVERY_STATUS } from "../delivery/delivery.interface";

// ---------------- Driver helpers ----------------
const assertDriverCapability = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");

  const roles = Array.isArray(user.roles) ? user.roles : [];
  const hasDriverRole = roles.includes(USER_ROLES.DRIVER);

  if (!hasDriverRole) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Driver role is not enabled for this account",
    );
  }

  return user;
};

const getEffectiveMode = (profile: any) => {
  return profile?.activeMode || profile?.role;
};

const isBasicInfoComplete = (doc: any) => {
  const dob = doc?.driverRegistration?.basicInfo?.dateOfBirth;
  const addr = doc?.driverRegistration?.basicInfo?.address;
  return !!dob && !!addr;
};

const isVehicleInfoComplete = (doc: any) => {
  const v = doc?.driverRegistration?.vehicleInfo;
  const hasImg =
    (Array.isArray(v?.vehicleImage) && v.vehicleImage.length > 0) ||
    typeof v?.vehicleImage === "string";
  return !!(v?.vehicleType && v?.licensePlateNumber && hasImg);
};

const isDocsComplete = (doc: any) => {
  const d = doc?.driverRegistration?.requiredDocs;
  return !!(d?.vehicleRegistrationDoc && d?.stateIdDoc && d?.driversLicenseDoc);
};

const createAdminToDB = async (payload: any): Promise<IUser> => {
  const isExistAdmin = await User.findOne({ email: payload.email });
  if (isExistAdmin) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  payload.verified = true;

  const admin = await User.create(payload);

  if (!admin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Admin");
  }

  return admin;
};

const getAdminFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
  }).select("firstName lastName email role profileImage createdAt updatedAt");

  const queryBuilder = new QueryBuilder<IUser>(baseQuery, query)
    .search(["fullName", "email"])
    .sort()
    .fields()
    .paginate();

  const admins = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return {
    data: admins,
    meta,
  };
};

const deleteAdminFromDB = async (id: any) => {
  const isExistAdmin = await User.findByIdAndDelete(id);

  if (!isExistAdmin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete Admin");
  }

  return isExistAdmin;
};

const createUserToDB = async (payload: any) => {
  if (!payload.email && !payload.phone) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Either email or phone is required",
    );
  }

  if (payload.role === USER_ROLES.CUSTOMER) {
    payload.roles = [USER_ROLES.CUSTOMER];
    payload.activeMode = USER_ROLES.CUSTOMER;
  }

  if (payload.role === USER_ROLES.DRIVER) {
    payload.roles = [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER];
    payload.activeMode = USER_ROLES.DRIVER;
  }

  const user = await User.create(payload);

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create user");
  }

  if (user.email) {
    const otp = generateOTP();

    await User.findByIdAndUpdate(user._id, {
      authentication: {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000),
      },
    });

    const template = emailTemplate.createAccount({
      name: user.fullName || "User",
      otp,
      email: user.email,
    });

    emailHelper.sendEmail(template);
  }

  if (user.phone) {
    try {
      await twilioService.sendOTPWithVerify(user.phone, user.countryCode);
    } catch (error: any) {
      console.error("Failed to send SMS OTP:", error?.message || error);
    }
  }

  return { user };
};

const getUserProfileFromDB = async (
  user: JwtPayload,
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser: any = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  return isExistUser;
};

const getProfileSummaryFromDB = async (
  user: JwtPayload,
  opts?: { includeStats?: boolean },
) => {
  const profile = await getUserProfileFromDB(user);

  if (!opts?.includeStats) {
    return { profile };
  }

  const calcCompletionRate = (completed: number, cancelled: number) => {
    const denom = completed + cancelled;
    if (denom <= 0) return 0;
    return Math.round((completed / denom) * 100);
  };

  const effectiveMode = getEffectiveMode(profile);

  if (effectiveMode === USER_ROLES.CUSTOMER) {
    const [total, completed, cancelled] = await Promise.all([
      Delivery.countDocuments({ customerId: user.id }),
      Delivery.countDocuments({
        customerId: user.id,
        status: {
          $in: [DELIVERY_STATUS.DELIVERED_CONFIRMED, DELIVERY_STATUS.PAYOUT_DONE],
        },
      }),
      Delivery.countDocuments({
        customerId: user.id,
        status: DELIVERY_STATUS.CANCELLED,
      }),
    ]);

    const ratingAgg = await Delivery.aggregate([
      {
        $match: {
          customerId: (profile as any)?._id,
          "rating.driverToCustomer.stars": { $gte: 1 },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: "$rating.driverToCustomer.stars" },
          count: { $sum: 1 },
        },
      },
    ]);

    const avgRating = ratingAgg?.[0]?.avg
      ? Number(ratingAgg[0].avg.toFixed(2))
      : 0;
    const ratingCount = ratingAgg?.[0]?.count ?? 0;

    return {
      profile,
      stats: {
        totalDeliveries: total,
        completedDeliveries: completed,
        cancelledDeliveries: cancelled,
        completionRate: calcCompletionRate(completed, cancelled),
        avgRating,
        ratingCount,
      },
    };
  }

  if (effectiveMode === USER_ROLES.DRIVER) {
    const [total, completed, cancelled, ratingAgg, earningsAgg] =
      await Promise.all([
        Delivery.countDocuments({ selectedDriverId: user.id }),

        Delivery.countDocuments({
          selectedDriverId: user.id,
          status: {
            $in: [
              DELIVERY_STATUS.DELIVERED_CONFIRMED,
              DELIVERY_STATUS.PAYOUT_DONE,
            ],
          },
        }),

        Delivery.countDocuments({
          selectedDriverId: user.id,
          status: DELIVERY_STATUS.CANCELLED,
        }),

        Delivery.aggregate([
          {
            $match: {
              selectedDriverId: (profile as any)?._id,
              "rating.customerToDriver.stars": { $gte: 1 },
            },
          },
          {
            $group: {
              _id: null,
              avg: { $avg: "$rating.customerToDriver.stars" },
              count: { $sum: 1 },
            },
          },
        ]),

        Transaction.aggregate([
          {
            $match: {
              driverId: (profile as any)?._id,
              status: TransactionStatus.SUCCEEDED,
              $or: [
                { refundStatus: { $exists: false } },
                { refundStatus: { $ne: RefundStatus.SUCCEEDED } },
              ],
            },
          },
          {
            $addFields: {
              driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
            },
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: "$driverAmountSafe" },
            },
          },
        ]),
      ]);

    const avgRating = ratingAgg?.[0]?.avg
      ? Number(ratingAgg[0].avg.toFixed(2))
      : 0;
    const ratingCount = ratingAgg?.[0]?.count ?? 0;
    const totalEarnings = earningsAgg?.[0]?.totalEarnings ?? 0;

    return {
      profile,
      stats: {
        totalDeliveries: total,
        completedDeliveries: completed,
        cancelledDeliveries: cancelled,
        completionRate: calcCompletionRate(completed, cancelled),
        avgRating,
        ratingCount,
        totalEarnings,
      },
    };
  }

  return { profile };
};

const getMyTransactionsFromDB = async (user: JwtPayload, query: any) => {
  const profile: any = await getUserProfileFromDB(user);
  const effectiveMode = getEffectiveMode(profile);

  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (effectiveMode === USER_ROLES.CUSTOMER) filter.customerId = user.id;
  else if (effectiveMode === USER_ROLES.DRIVER) filter.driverId = user.id;
  else throw new ApiError(StatusCodes.FORBIDDEN, "Only customer/driver");

  if (query.status) filter.status = query.status as TransactionStatus;
  if (query.payoutStatus) filter.payoutStatus = query.payoutStatus as PayoutStatus;
  if (query.refundStatus) filter.refundStatus = query.refundStatus as RefundStatus;

  const [data, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("deliveryId")
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

const getDriverEarningsFromDB = async (user: JwtPayload) => {
  const profile: any = await getUserProfileFromDB(user);
  const effectiveMode = getEffectiveMode(profile);
  console.log("Profile in earnings:", profile);
  const roles = Array.isArray(profile?.roles) ? profile.roles : [];

  if (
    effectiveMode !== USER_ROLES.DRIVER ||
    !roles.includes(USER_ROLES.DRIVER)
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver can access earnings");
  }

  const driverId = new Types.ObjectId(user.id);
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const transactionMatch = {
    driverId,
    status: TransactionStatus.SUCCEEDED,
    $or: [
      { refundStatus: { $exists: false } },
      { refundStatus: { $ne: RefundStatus.SUCCEEDED } },
    ],
  };

  const payoutAgg = await Transaction.aggregate([
    {
      $match: transactionMatch,
    },
    {
      $addFields: {
        payoutStatusSafe: { $ifNull: ["$payoutStatus", PayoutStatus.NONE] },
        driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
      },
    },
    {
      $group: {
        _id: "$payoutStatusSafe",
        total: { $sum: "$driverAmountSafe" },
        count: { $sum: 1 },
      },
    },
  ]);

  const byStatus: Record<string, { total: number; count: number }> = {};
  for (const row of payoutAgg) {
    byStatus[String(row._id)] = {
      total: row.total ?? 0,
      count: row.count ?? 0,
    };
  }

  const availableForPayout =
    (byStatus[PayoutStatus.NONE]?.total ?? 0) +
    (byStatus[PayoutStatus.PENDING]?.total ?? 0);

  const paidOut = byStatus[PayoutStatus.SUCCEEDED]?.total ?? 0;
  const payoutFailedAmount = byStatus[PayoutStatus.FAILED]?.total ?? 0;
  const lifetimeEarnings = availableForPayout + paidOut + payoutFailedAmount;

  const monthAgg = await Transaction.aggregate([
    {
      $match: {
        ...transactionMatch,
        createdAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      },
    },
    {
      $addFields: {
        driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$driverAmountSafe" },
      },
    },
  ]);

  const thisMonthEarnings = monthAgg[0]?.total ?? 0;

  const todayEarningsAgg = await Transaction.aggregate([
    {
      $match: {
        ...transactionMatch,
        createdAt: {
          $gte: startOfToday,
          $lt: startOfTomorrow,
        },
      },
    },
    {
      $addFields: {
        driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$driverAmountSafe" },
      },
    },
  ]);

  const todayEarnings = todayEarningsAgg[0]?.total ?? 0;

  const totalCompletedDeliveries = await Delivery.countDocuments({
    selectedDriverId: driverId,
    status: DELIVERY_STATUS.DELIVERED_CONFIRMED,
  });

  const todayDeliveries = await Delivery.countDocuments({
    selectedDriverId: driverId,
    status: DELIVERY_STATUS.DELIVERED_CONFIRMED,
    updatedAt: {
      $gte: startOfToday,
      $lt: startOfTomorrow,
    },
  } as any);

  return {
    totalEarnings: lifetimeEarnings,
    thisMonthEarnings,
    totalCompletedDeliveries,
    todayDeliveries,
    todayEarnings,
    lifetimeEarnings,
    availableForPayout,
    paidOut,
    payoutFailedAmount,
    breakdown: byStatus,
  };
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (payload.profileImage && isExistUser.profileImage) {
    unlinkFile(isExistUser.profileImage);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return updateDoc;
};

const getAllUsersFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: USER_ROLES.CUSTOMER,
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["fullName", "email", "phone"])
    .sort()
    .fields()
    .filter()
    .paginate();

  const users = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  if (!users) throw new ApiError(404, "No users are found in the database");

  return {
    data: users,
    meta,
  };
};

const getUserByIdFromDB = async (id: string) => {
  const result = await User.findOne({
    _id: id,
    role: USER_ROLES.CUSTOMER,
  });

  if (!result)
    throw new ApiError(404, "No user is found in the database by this ID");

  return result;
};

const deleteUserByIdFromD = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, "User doest not exist in the database");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete user by this ID");
  }

  return result;
};

const deleteProfileFromDB = async (id: string) => {
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete this user");
  }
  return result;
};

// ============================ Driver Registration ============================

const enableDriverRoleToDB = async (user: JwtPayload) => {
  const existing: any = await User.findById(user.id);
  if (!existing) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const roles = Array.isArray(existing.roles) ? [...existing.roles] : [];

  if (!roles.includes(USER_ROLES.CUSTOMER)) {
    roles.push(USER_ROLES.CUSTOMER);
  }

  if (!roles.includes(USER_ROLES.DRIVER)) {
    roles.push(USER_ROLES.DRIVER);
  }

  const updated = await User.findByIdAndUpdate(
    user.id,
    {
      $set: {
        roles,
        driverRegistration: existing.driverRegistration || {},
      },
    },
    { new: true },
  ).select("-password -authentication");

  return updated;
};

const switchUserModeToDB = async (
  user: JwtPayload,
  payload: { mode: USER_ROLES.CUSTOMER | USER_ROLES.DRIVER },
) => {
  const existing: any = await User.findById(user.id);
  if (!existing) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const targetMode = payload.mode;
  const roles = Array.isArray(existing.roles) ? existing.roles : [];

  if (targetMode === USER_ROLES.CUSTOMER) {
    const updated = await User.findByIdAndUpdate(
      user.id,
      { $set: { activeMode: USER_ROLES.CUSTOMER } },
      { new: true },
    ).select("-password -authentication");

    return {
      switchAllowed: true,
      activeMode: updated?.activeMode,
      nextAction: "GO_CUSTOMER_HOME",
      driverApplicationStatus:
        updated?.driverRegistration?.applicationStatus ??
        DRIVER_APPLICATION_STATUS.NONE,
      user: updated,
    };
  }

  if (!roles.includes(USER_ROLES.DRIVER)) {
    return {
      switchAllowed: false,
      activeMode: existing.activeMode,
      nextAction: "GO_DRIVER_REGISTRATION",
      driverApplicationStatus: DRIVER_APPLICATION_STATUS.NONE,
    };
  }

  const applicationStatus =
    existing.driverRegistration?.applicationStatus ??
    DRIVER_APPLICATION_STATUS.NONE;

  if (applicationStatus === DRIVER_APPLICATION_STATUS.NONE) {
    return {
      switchAllowed: false,
      activeMode: existing.activeMode,
      nextAction: "GO_DRIVER_REGISTRATION",
      driverApplicationStatus: applicationStatus,
    };
  }

  if (applicationStatus === DRIVER_APPLICATION_STATUS.SUBMITTED) {
    return {
      switchAllowed: false,
      activeMode: existing.activeMode,
      nextAction: "WAIT_FOR_APPROVAL",
      driverApplicationStatus: applicationStatus,
    };
  }

  if (applicationStatus === DRIVER_APPLICATION_STATUS.REJECTED) {
    return {
      switchAllowed: false,
      activeMode: existing.activeMode,
      nextAction: "SHOW_REJECTED_SCREEN",
      driverApplicationStatus: applicationStatus,
    };
  }

  const updated = await User.findByIdAndUpdate(
    user.id,
    { $set: { activeMode: USER_ROLES.DRIVER } },
    { new: true },
  ).select("-password -authentication");

  return {
    switchAllowed: true,
    activeMode: updated?.activeMode,
    nextAction: "GO_DRIVER_HOME",
    driverApplicationStatus: DRIVER_APPLICATION_STATUS.APPROVED,
    user: updated,
  };
};

const getMyDriverRegistrationFromDB = async (user: JwtPayload) => {
  const { id } = user;
  const doc = await assertDriverCapability(id);

  return {
    user: {
      _id: doc._id,
      firstName: doc.firstName,
      lastName: doc.lastName,
      fullName: doc.fullName,
      email: doc.email,
      phone: doc.phone,
      countryCode: doc.countryCode,
      profileImage: doc.profileImage,
      role: doc.role,
      roles: doc.roles,
      activeMode: doc.activeMode,
    },
    driverRegistration: doc.driverRegistration || {},
  };
};

const updateDriverBasicInfoToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  const doc = await assertDriverCapability(id);

  if (payload.profileImage && doc.profileImage) {
    unlinkFile(doc.profileImage);
  }

  const updatePayload: any = {};

  ["firstName", "lastName", "email", "phone", "countryCode", "profileImage"].forEach(
    (k) => {
      if (payload?.[k] !== undefined) updatePayload[k] = payload[k];
    },
  );

  if (payload.dateOfBirth !== undefined) {
    updatePayload["driverRegistration.basicInfo.dateOfBirth"] = payload.dateOfBirth;
  }
  if (payload.ssn !== undefined) {
    updatePayload["driverRegistration.basicInfo.ssn"] = payload.ssn;
  }
  if (payload.address !== undefined) {
    updatePayload["driverRegistration.basicInfo.address"] = payload.address;
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true },
  );
  if (!updated) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update driver basic info");
  }

  const basicOk = isBasicInfoComplete(updated);

  await User.findByIdAndUpdate(id, {
    $set: { "driverRegistration.steps.basicInfoCompleted": basicOk },
  });

  return getMyDriverRegistrationFromDB({ id } as any);
};

const updateDriverVehicleInfoToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  const doc = await assertDriverCapability(id);

  const updatePayload: any = {};

  ["vehicleType", "make", "year", "licensePlateNumber", "color"].forEach((k) => {
    if (payload?.[k] !== undefined) {
      updatePayload[`driverRegistration.vehicleInfo.${k}`] = payload[k];
    }
  });

  if (payload.vehicleImage) {
    const imagePath = Array.isArray(payload.vehicleImage)
      ? payload.vehicleImage
      : [payload.vehicleImage];

    const old = doc.driverRegistration?.vehicleInfo?.vehicleImage as any;

    if (old) {
      if (Array.isArray(old)) {
        old.forEach((p) => p && unlinkFile(p));
      } else {
        unlinkFile(old);
      }
    }

    updatePayload["driverRegistration.vehicleInfo.vehicleImage"] = imagePath;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No vehicle info provided");
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update driver vehicle info");
  }

  const vehicleOk = isVehicleInfoComplete(updated);

  await User.findByIdAndUpdate(id, {
    $set: { "driverRegistration.steps.vehicleInfoCompleted": vehicleOk },
  });

  return getMyDriverRegistrationFromDB({ id } as any);
};

const updateDriverRequiredDocsToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  const doc = await assertDriverCapability(id);

  const docs = doc.driverRegistration?.requiredDocs || {};
  const fields = [
    "vehicleRegistrationDoc",
    "stateIdDoc",
    "driversLicenseDoc",
    "ssnDoc",
    "insuranceDoc",
  ];

  const updatePayload: any = {};
  for (const f of fields) {
    if (payload?.[f] !== undefined) {
      const prev = (docs as any)[f];
      if (prev && prev !== payload[f]) unlinkFile(prev);
      updatePayload[`driverRegistration.requiredDocs.${f}`] = payload[f];
    }
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true },
  );
  if (!updated) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update required documents");
  }

  const docsOk = isDocsComplete(updated);

  await User.findByIdAndUpdate(id, {
    $set: { "driverRegistration.steps.requiredDocsCompleted": docsOk },
  });

  return getMyDriverRegistrationFromDB({ id } as any);
};

const updateDriverReferralToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  await assertDriverCapability(id);

  const updated = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        "driverRegistration.referralCode":
          payload.referralCode === undefined ? null : payload.referralCode,
        "driverRegistration.steps.referralCompleted": true,
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update referral");
  }

  return getMyDriverRegistrationFromDB({ id } as any);
};

const submitDriverApplicationToDB = async (user: JwtPayload) => {
  const { id } = user;
  await assertDriverCapability(id);

  const current = await User.findById(id);
  if (!current) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const steps = current.driverRegistration?.steps || {};
  const basicOk = steps.basicInfoCompleted || isBasicInfoComplete(current);
  const vehicleOk = steps.vehicleInfoCompleted || isVehicleInfoComplete(current);
  const docsOk = steps.requiredDocsCompleted || isDocsComplete(current);

  if (!basicOk || !vehicleOk || !docsOk) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Driver registration is incomplete. Please complete Basic info, Vehicle info and Required docs.",
    );
  }

  const updated = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        "driverRegistration.applicationStatus": DRIVER_APPLICATION_STATUS.SUBMITTED,
        "driverRegistration.submittedAt": new Date(),
      },
    },
    { new: true },
  );

  return {
    message: "Application sent",
    submittedAt: updated?.driverRegistration?.submittedAt,
    applicationStatus: updated?.driverRegistration?.applicationStatus,
  };
};

// =========================== Driver Registration End ============================

const updateDriverLocationToDB = async (
  user: JwtPayload,
  payload: { lat: number; lng: number },
) => {
  const profile: any = await getUserProfileFromDB(user);
  const effectiveMode = getEffectiveMode(profile);
  const roles = Array.isArray(profile?.roles) ? profile.roles : [];

  if (
    effectiveMode !== USER_ROLES.DRIVER ||
    !roles.includes(USER_ROLES.DRIVER)
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver can update location");
  }

  const updated = await User.findByIdAndUpdate(
    user.id,
    {
      $set: {
        "driverStatus.isOnline": true,
        "driverStatus.location": {
          type: "Point",
          coordinates: [payload.lng, payload.lat],
        },
        "driverStatus.locationUpdatedAt": new Date(),
      },
    },
    { new: true },
  ).select("-password -authentication");

  return updated;
};

const updateDriverAvailabilityToDB = async (
  user: JwtPayload,
  payload: { isOnline?: boolean; isAvailable?: boolean },
) => {
  const profile: any = await getUserProfileFromDB(user);
  const effectiveMode = getEffectiveMode(profile);
  const roles = Array.isArray(profile?.roles) ? profile.roles : [];

  if (
    effectiveMode !== USER_ROLES.DRIVER ||
    !roles.includes(USER_ROLES.DRIVER)
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver can update availability");
  }

  const set: any = {};
  if (payload.isOnline !== undefined) set["driverStatus.isOnline"] = payload.isOnline;
  if (payload.isAvailable !== undefined) set["driverStatus.isAvailable"] = payload.isAvailable;

  const updated = await User.findByIdAndUpdate(
    user.id,
    { $set: set },
    { new: true },
  ).select("-password -authentication");

  return updated;
};

export const UserService = {
  createUserToDB,
  getAdminFromDB,
  deleteAdminFromDB,
  getUserProfileFromDB,
  updateProfileToDB,
  createAdminToDB,
  getAllUsersFromDB,
  getUserByIdFromDB,
  deleteUserByIdFromD,
  deleteProfileFromDB,

  getMyDriverRegistrationFromDB,
  updateDriverBasicInfoToDB,
  updateDriverVehicleInfoToDB,
  updateDriverRequiredDocsToDB,
  updateDriverReferralToDB,
  submitDriverApplicationToDB,

  updateDriverLocationToDB,
  updateDriverAvailabilityToDB,

  getProfileSummaryFromDB,
  getMyTransactionsFromDB,
  getDriverEarningsFromDB,

  enableDriverRoleToDB,
  switchUserModeToDB,
};

// import { USER_ROLES } from "../../../enums/user";
// import { IUser } from "./user.interface";
// import { JwtPayload, Secret } from "jsonwebtoken";
// import { User } from "./user.model";
// import { StatusCodes } from "http-status-codes";
// import ApiError from "../../../errors/ApiErrors";
// import unlinkFile from "../../../shared/unlinkFile";
// import QueryBuilder from "../../builder/queryBuilder";
// import generateOTP from "../../../util/generateOTP";
// import { emailTemplate } from "../../../shared/emailTemplate";
// import { emailHelper } from "../../../helpers/emailHelper";
// import { twilioService } from "../../../helpers/smsHelper";
// import { PayoutStatus, RefundStatus, Transaction, TransactionStatus } from "../payment/transaction.model";
// import { Types } from "mongoose";
// import { Delivery } from "../delivery/delivery.model";
// import { DELIVERY_STATUS } from "../delivery/delivery.interface";
 
 

// // ---------------- Driver registration helpers ----------------
// const assertDriver = async (id: string) => {
//   const user = await User.findById(id);
//   if (!user) throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   if (user.role !== USER_ROLES.DRIVER) {
//     throw new ApiError(
//       StatusCodes.FORBIDDEN,
//       "Only driver can access this resource",
//     );
//   }
//   return user;
// };

// const isBasicInfoComplete = (doc: any) => {
//   const dob = doc?.driverRegistration?.basicInfo?.dateOfBirth;
//   const addr = doc?.driverRegistration?.basicInfo?.address;
//   const hasAddress = !!(addr?.street && addr?.city && addr?.state && addr?.zip);
//   return !!dob && hasAddress;
// };

// const isVehicleInfoComplete = (doc: any) => {
//   const v = doc?.driverRegistration?.vehicleInfo;
//   const hasImg = Array.isArray(v?.vehicleImage) && v.vehicleImage.length > 0;
//   return !!(v?.vehicleType && v?.licensePlateNumber && hasImg);
// };

// const isDocsComplete = (doc: any) => {
//   const d = doc?.driverRegistration?.requiredDocs;
//   return !!(d?.vehicleRegistrationDoc && d?.stateIdDoc && d?.driversLicenseDoc);
// };

// const createAdminToDB = async (payload: any): Promise<IUser> => {
//   const isExistAdmin = await User.findOne({ email: payload.email });
//   if (isExistAdmin) {
//     throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
//   }

//   payload.verified = true;

//   const admin = await User.create(payload);

//   if (!admin) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Admin");
//   }

//   return admin;
// };

// const getAdminFromDB = async (query: any) => {
//   const baseQuery = User.find({
//     role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
//   }).select("firstName lastName email role profileImage createdAt updatedAt");

//   const queryBuilder = new QueryBuilder<IUser>(baseQuery, query)
//     .search(["fullName", "email"])
//     .sort()
//     .fields()
//     .paginate();

//   const admins = await queryBuilder.modelQuery;

//   const meta = await queryBuilder.countTotal();

//   return {
//     data: admins,
//     meta,
//   };
// };

// const deleteAdminFromDB = async (id: any) => {
//   const isExistAdmin = await User.findByIdAndDelete(id);

//   if (!isExistAdmin) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete Admin");
//   }

//   return isExistAdmin;
// };

// // const createUserToDB = async (payload: any) => {
// //   const createUser = await User.create(payload);
// //   console.log(createUser, "Create User");
// //   if (!createUser) {
// //     throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create user");
// //   }

// //   //send email
// //   const otp = generateOTP();
// //   const values = {
// //     name: createUser.fullName || "User",
// //     otp: otp,
// //     email: createUser.email!,
// //   };

// //   const createAccountTemplate = emailTemplate.createAccount(values);
// //   emailHelper.sendEmail(createAccountTemplate);

// //   //save to DB
// //   const authentication = {
// //     oneTimeCode: otp,
// //     expireAt: new Date(Date.now() + 3 * 60000),
// //   };

// //   await User.findOneAndUpdate(
// //     { _id: createUser._id },
// //     { $set: { authentication } }
// //   );

// //   // const createToken = jwtHelper.createToken(
// //   //   {
// //   //     id: createUser._id,
// //   //     email: createUser.email,
// //   //     role: createUser.role,
// //   //   },
// //   //   config.jwt.jwt_secret as Secret,
// //   //   config.jwt.jwt_expire_in as string
// //   // );

// //   const result = {
// //     // token: createToken,
// //     user: createUser,
// //   };

// //   return result;
// // };

// // ================================= Create USER  ================================

// const createUserToDB = async (payload: any) => {
//   if (!payload.email && !payload.phone) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Either email or phone is required",
//     );
//   }

//   const user = await User.create(payload);

//   if (!user) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create user");
//   }

//   // ✅ EMAIL REGISTRATION FLOW
//   if (user.email) {
//     const otp = generateOTP();

//     await User.findByIdAndUpdate(user._id, {
//       authentication: {
//         oneTimeCode: otp,
//         expireAt: new Date(Date.now() + 3 * 60000),
//       },
//     });

//     const template = emailTemplate.createAccount({
//       name: user.fullName || "User",
//       otp,
//       email: user.email,
//     });

//     emailHelper.sendEmail(template);
//   }

//   // ✅ PHONE REGISTRATION FLOW
//   if (user.phone) {
//     try {
//       await twilioService.sendOTPWithVerify(user.phone, user.countryCode);
//     } catch (error: any) {
//       // Log the SMS error but don't fail the registration flow
//       // so users can still be created even if SMS service issues occur.
//       console.error("Failed to send SMS OTP:", error?.message || error);
//     }
//   }

//   return { user };
// };

// const getUserProfileFromDB = async (
//   user: JwtPayload,
// ): Promise<Partial<IUser>> => {
//   const { id } = user;
//   const isExistUser: any = await User.isExistUserById(id);
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }
//   return isExistUser;
// };


// // =======================888888888888888======================

// const getProfileSummaryFromDB = async (
//   user: JwtPayload,
//   opts?: { includeStats?: boolean },
// ) => {
//   const profile = await getUserProfileFromDB(user);

//   if (!opts?.includeStats) {
//     return { profile };
//   }

//   // ------------------ Common helpers ------------------
//   const calcCompletionRate = (completed: number, cancelled: number) => {
//     const denom = completed + cancelled;
//     if (denom <= 0) return 0;
//     return Math.round((completed / denom) * 100);
//   };

//   // ------------------ Customer stats ------------------
//   if (user.role === USER_ROLES.CUSTOMER) {
//     const [total, completed, cancelled] = await Promise.all([
//       Delivery.countDocuments({ customerId: user.id }),
//       Delivery.countDocuments({
//         customerId: user.id,
//         status: { $in: [DELIVERY_STATUS.DELIVERED_CONFIRMED, DELIVERY_STATUS.PAYOUT_DONE] },
//       }),
//       Delivery.countDocuments({ customerId: user.id, status: DELIVERY_STATUS.CANCELLED }),
//     ]);

//     const ratingAgg = await Delivery.aggregate([
//       {
//         $match: {
//           customerId: (profile as any)?._id,
//           "rating.driverToCustomer.stars": { $gte: 1 },
//         },
//       },
//       { $group: { _id: null, avg: { $avg: "$rating.driverToCustomer.stars" }, count: { $sum: 1 } } },
//     ]);

//     const avgRating = ratingAgg?.[0]?.avg ? Number(ratingAgg[0].avg.toFixed(2)) : 0;
//     const ratingCount = ratingAgg?.[0]?.count ?? 0;

//     return {
//       profile,
//       stats: {
//         totalDeliveries: total,
//         completedDeliveries: completed,
//         cancelledDeliveries: cancelled,
//         completionRate: calcCompletionRate(completed, cancelled),
//         avgRating,
//         ratingCount,
//       },
//     };
//   }

//   // ------------------ Driver stats ------------------
 
// if (user.role === USER_ROLES.DRIVER) {
//   const [total, completed, cancelled, ratingAgg, earningsAgg] = await Promise.all([
//     Delivery.countDocuments({ selectedDriverId: user.id }),

//     Delivery.countDocuments({
//       selectedDriverId: user.id,
//       status: { $in: [DELIVERY_STATUS.DELIVERED_CONFIRMED, DELIVERY_STATUS.PAYOUT_DONE] },
//     }),

//     Delivery.countDocuments({
//       selectedDriverId: user.id,
//       status: DELIVERY_STATUS.CANCELLED,
//     }),

//     Delivery.aggregate([
//       {
//         $match: {
//           selectedDriverId: (profile as any)?._id,
//           "rating.customerToDriver.stars": { $gte: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           avg: { $avg: "$rating.customerToDriver.stars" },
//           count: { $sum: 1 },
//         },
//       },
//     ]),

//     Transaction.aggregate([
//       {
//         $match: {
//           driverId: (profile as any)?._id,
//           status: TransactionStatus.SUCCEEDED,
//           $or: [
//             { refundStatus: { $exists: false } },
//             { refundStatus: { $ne: RefundStatus.SUCCEEDED } },
//           ],
//         },
//       },
//       {
//         $addFields: {
//           driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           totalEarnings: { $sum: "$driverAmountSafe" },
//         },
//       },
//     ]),
//   ]);

//   const avgRating = ratingAgg?.[0]?.avg ? Number(ratingAgg[0].avg.toFixed(2)) : 0;
//   const ratingCount = ratingAgg?.[0]?.count ?? 0;
//   const totalEarnings = earningsAgg?.[0]?.totalEarnings ?? 0;

//   return {
//     profile,
//     stats: {
//       totalDeliveries: total,
//       completedDeliveries: completed,
//       cancelledDeliveries: cancelled,
//       completionRate: calcCompletionRate(completed, cancelled),
//       avgRating,
//       ratingCount,
//       totalEarnings,
//     },
//   };
// }

//   return { profile };
// };

// const getMyTransactionsFromDB = async (user: JwtPayload, query: any) => {
//   const page = Math.max(1, Number(query.page ?? 1));
//   const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
//   const skip = (page - 1) * limit;

//   const filter: any = {};
//   if (user.role === USER_ROLES.CUSTOMER) filter.customerId = user.id;
//   else if (user.role === USER_ROLES.DRIVER) filter.driverId = user.id;
//   else throw new ApiError(StatusCodes.FORBIDDEN, "Only customer/driver");

//   if (query.status) filter.status = query.status as TransactionStatus;
//   if (query.payoutStatus) filter.payoutStatus = query.payoutStatus as PayoutStatus;
//   if (query.refundStatus) filter.refundStatus = query.refundStatus as RefundStatus;

//   const [data, total] = await Promise.all([
//     Transaction.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate("deliveryId")
//       .lean(),
//     Transaction.countDocuments(filter),
//   ]);

//   return {
//     meta: {
//       page,
//       limit,
//       total,
//       totalPage: Math.ceil(total / limit),
//     },
//     data,
//   };
// };

 

// const getDriverEarningsFromDB = async (user: JwtPayload) => {
//   if (user.role !== USER_ROLES.DRIVER) {
//     throw new ApiError(StatusCodes.FORBIDDEN, "Only driver can access earnings");
//   }

//   const driverId = new Types.ObjectId(user.id);
//   const now = new Date();

//   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//   const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

//   const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//   const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

//   const transactionMatch = {
//     driverId,
//     status: TransactionStatus.SUCCEEDED,
//     $or: [
//       { refundStatus: { $exists: false } },
//       { refundStatus: { $ne: RefundStatus.SUCCEEDED } },
//     ],
//   };

//   // 1) Lifetime / payout summary
//   const payoutAgg = await Transaction.aggregate([
//     {
//       $match: transactionMatch,
//     },
//     {
//       $addFields: {
//         payoutStatusSafe: { $ifNull: ["$payoutStatus", PayoutStatus.NONE] },
//         driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
//       },
//     },
//     {
//       $group: {
//         _id: "$payoutStatusSafe",
//         total: { $sum: "$driverAmountSafe" },
//         count: { $sum: 1 },
//       },
//     },
//   ]);

//   const byStatus: Record<string, { total: number; count: number }> = {};
//   for (const row of payoutAgg) {
//     byStatus[String(row._id)] = {
//       total: row.total ?? 0,
//       count: row.count ?? 0,
//     };
//   }

//   const availableForPayout =
//     (byStatus[PayoutStatus.NONE]?.total ?? 0) +
//     (byStatus[PayoutStatus.PENDING]?.total ?? 0);

//   const paidOut = byStatus[PayoutStatus.SUCCEEDED]?.total ?? 0;
//   const payoutFailedAmount = byStatus[PayoutStatus.FAILED]?.total ?? 0;
//   const lifetimeEarnings = availableForPayout + paidOut + payoutFailedAmount;

//   // 2) This month's earnings
//   const monthAgg = await Transaction.aggregate([
//     {
//       $match: {
//         ...transactionMatch,
//         createdAt: {
//           $gte: startOfMonth,
//           $lt: startOfNextMonth,
//         },
//       },
//     },
//     {
//       $addFields: {
//         driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
//       },
//     },
//     {
//       $group: {
//         _id: null,
//         total: { $sum: "$driverAmountSafe" },
//       },
//     },
//   ]);

//   const thisMonthEarnings = monthAgg[0]?.total ?? 0;

//   // 3) Today's earnings
//   const todayEarningsAgg = await Transaction.aggregate([
//     {
//       $match: {
//         ...transactionMatch,
//         createdAt: {
//           $gte: startOfToday,
//           $lt: startOfTomorrow,
//         },
//       },
//     },
//     {
//       $addFields: {
//         driverAmountSafe: { $ifNull: ["$driverReceiptAmount", 0] },
//       },
//     },
//     {
//       $group: {
//         _id: null,
//         total: { $sum: "$driverAmountSafe" },
//       },
//     },
//   ]);

//   const todayEarnings = todayEarningsAgg[0]?.total ?? 0;

//   // 4) Total completed deliveries
//   const totalCompletedDeliveries = await Delivery.countDocuments({
//     selectedDriverId: driverId,
//     status: DELIVERY_STATUS.DELIVERED_CONFIRMED,
//   });

//   // 5) Today's completed deliveries
//   const todayDeliveries = await Delivery.countDocuments({
//     selectedDriverId: driverId,
//     status: DELIVERY_STATUS.DELIVERED_CONFIRMED,
//     updatedAt: {
//       $gte: startOfToday,
//       $lt: startOfTomorrow,
//     },
//   });

//   return {
//     totalEarnings: lifetimeEarnings, // top red card
//     thisMonthEarnings,
//     totalCompletedDeliveries,
//     todayDeliveries,
//     todayEarnings,

//     // existing useful fields
//     lifetimeEarnings,
//     availableForPayout,
//     paidOut,
//     payoutFailedAmount,
//     breakdown: byStatus,
//   };
// };


// // =======================888888888888888============================================

// const updateProfileToDB = async (
//   user: JwtPayload,
//   payload: Partial<IUser>,
// ): Promise<Partial<IUser | null>> => {
//   const { id } = user;
//   const isExistUser = await User.isExistUserById(id);
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }

//   //unlink file here
//   if (payload.profileImage && isExistUser.profileImage) {
//     unlinkFile(isExistUser.profileImage);
//   }

//   const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
//     new: true,
//   });
//   return updateDoc;
// };

// const getAllUsersFromDB = async (query: any) => {
//   const baseQuery = User.find({
//     role: USER_ROLES.CUSTOMER,
//   });

//   const queryBuilder = new QueryBuilder(baseQuery, query)
//     .search(["fullName", "email", "phone"])
//     .sort()
//     .fields()
//     .filter()
//     .paginate();

//   const users = await queryBuilder.modelQuery;

//   const meta = await queryBuilder.countTotal();

//   if (!users) throw new ApiError(404, "No users are found in the database");

//   return {
//     data: users,
//     meta,
//   };
// };

// const getUserByIdFromDB = async (id: string) => {
//   const result = await User.findOne({
//     _id: id,
//     role: USER_ROLES.CUSTOMER,
//   });

//   if (!result)
//     throw new ApiError(404, "No user is found in the database by this ID");

//   return result;
// };

// const deleteUserByIdFromD = async (id: string) => {
//   const user = await User.findById(id);

//   if (!user) {
//     throw new ApiError(404, "User doest not exist in the database");
//   }

//   const result = await User.findByIdAndDelete(id);

//   if (!result) {
//     throw new ApiError(400, "Failed to delete user by this ID");
//   }

//   return result;
// };

// const deleteProfileFromDB = async (id: string) => {
//   const isExistUser = await User.isExistUserById(id);
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }

//   const result = await User.findByIdAndDelete(id);

//   if (!result) {
//     throw new ApiError(400, "Failed to delete this user");
//   }
//   return result;
// };

// // ============================ Driver Registration ============================

// const getMyDriverRegistrationFromDB = async (user: JwtPayload) => {
//   const { id } = user;
//   const doc = await assertDriver(id);
//   return {
//     user: {
//       _id: doc._id,
//       firstName: doc.firstName,
//       lastName: doc.lastName,
//       fullName: doc.fullName,
//       email: doc.email,
//       phone: doc.phone,
//       countryCode: doc.countryCode,
//       profileImage: doc.profileImage,
//       role: doc.role,
//     },
//     driverRegistration: doc.driverRegistration || {},
//   };
// };

// const updateDriverBasicInfoToDB = async (user: JwtPayload, payload: any) => {
//   const { id } = user;
//   const doc = await assertDriver(id);

//   // unlink profile image if replacing
//   if (payload.profileImage && doc.profileImage) {
//     unlinkFile(doc.profileImage);
//   }

//   const updatePayload: any = {};

//   // top-level user fields
//   [
//     "firstName",
//     "lastName",
//     "email",
//     "phone",
//     "countryCode",
//     "profileImage",
//   ].forEach((k) => {
//     if (payload?.[k] !== undefined) updatePayload[k] = payload[k];
//   });

//   // nested driver basic info
//   if (payload.dateOfBirth !== undefined) {
//     updatePayload["driverRegistration.basicInfo.dateOfBirth"] =
//       payload.dateOfBirth;
//   }
//   if (payload.ssn !== undefined) {
//     updatePayload["driverRegistration.basicInfo.ssn"] = payload.ssn;
//   }
//   if (payload.address !== undefined) {
    
//       updatePayload["driverRegistration.basicInfo.address"] = payload.address;
 
//   }

//   const updated = await User.findByIdAndUpdate(
//     id,
//     { $set: updatePayload },
//     { new: true },
//   );
//   if (!updated)
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Failed to update driver basic info",
//     );

//   const basicOk = isBasicInfoComplete(updated);
//   await User.findByIdAndUpdate(id, {
//     $set: { "driverRegistration.steps.basicInfoCompleted": basicOk },
//   });

//   return getMyDriverRegistrationFromDB({ id } as any);
//   // 1) steps update করার পর latest user আবার fetch করো (full)
//   // const finalUser = await User.findById(id)
//   //   .select("-password -authentication") // security
//   //   .lean();

//   // if (!finalUser) {
//   //   throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to load updated user");
//   // }

//   // return finalUser;
// };

 
// const updateDriverVehicleInfoToDB = async (user: JwtPayload, payload: any) => {
//   const { id } = user;
//   const doc = await assertDriver(id);

//   const updatePayload: any = {};

//   ["vehicleType", "make", "year", "licensePlateNumber", "color"].forEach(
//     (k) => {
//       if (payload?.[k] !== undefined) {
//         updatePayload[`driverRegistration.vehicleInfo.${k}`] = payload[k];
//       }
//     },
//   );

// if (payload.vehicleImage) {
//   const imagePath = Array.isArray(payload.vehicleImage)
//     ? payload.vehicleImage[0]
//     : payload.vehicleImage;

//   const old = doc.driverRegistration?.vehicleInfo?.vehicleImage as any;

//   if (old) {
//     if (Array.isArray(old)) {
//       old.forEach((p) => p && unlinkFile(p));
//     } else {
//       unlinkFile(old);
//     }
//   }

//   updatePayload["driverRegistration.vehicleInfo.vehicleImage"] = imagePath;
// }

//   if (Object.keys(updatePayload).length === 0) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "No vehicle info provided");
//   }

//   const updated = await User.findByIdAndUpdate(
//     id,
//     { $set: updatePayload },
//     { new: true, runValidators: true },
//   );

//   if (!updated)
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Failed to update driver vehicle info",
//     );

//   const vehicleOk = isVehicleInfoComplete(updated);

//   await User.findByIdAndUpdate(id, {
//     $set: { "driverRegistration.steps.vehicleInfoCompleted": vehicleOk },
//   });

//   // return await User.findById(id).select("-password -authentication").lean();
//   return getMyDriverRegistrationFromDB({ id } as any);
// };

// const updateDriverRequiredDocsToDB = async (user: JwtPayload, payload: any) => {
//   const { id } = user;
//   const doc = await assertDriver(id);

//   const docs = doc.driverRegistration?.requiredDocs || {};
//   const fields = [
//     "vehicleRegistrationDoc",
//     "stateIdDoc",
//     "driversLicenseDoc",
//     "ssnDoc",
//     "insuranceDoc",
//   ];

//   const updatePayload: any = {};
//   for (const f of fields) {
//     if (payload?.[f] !== undefined) {
//       const prev = (docs as any)[f];
//       if (prev && prev !== payload[f]) unlinkFile(prev);
//       updatePayload[`driverRegistration.requiredDocs.${f}`] = payload[f];
//     }
//   }

//   const updated = await User.findByIdAndUpdate(
//     id,
//     { $set: updatePayload },
//     { new: true },
//   );
//   if (!updated)
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Failed to update required documents",
//     );

//   const docsOk = isDocsComplete(updated);
//   await User.findByIdAndUpdate(id, {
//     $set: { "driverRegistration.steps.requiredDocsCompleted": docsOk },
//   });

//   return getMyDriverRegistrationFromDB({ id } as any);
// };

// const updateDriverReferralToDB = async (user: JwtPayload, payload: any) => {
//   const { id } = user;
//   await assertDriver(id);
//   const updated = await User.findByIdAndUpdate(
//     id,
//     {
//       $set: {
//         "driverRegistration.referralCode":
//           payload.referralCode === undefined ? null : payload.referralCode,
//         "driverRegistration.steps.referralCompleted": true,
//       },
//     },
//     { new: true },
//   );
//   if (!updated)
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update referral");
//   return getMyDriverRegistrationFromDB({ id } as any);
// };

// const submitDriverApplicationToDB = async (user: JwtPayload) => {
//   const { id } = user;
//   await assertDriver(id);
//   const current = await User.findById(id);
//   if (!current)
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");

//   const steps = current.driverRegistration?.steps || {};
//   const basicOk = steps.basicInfoCompleted || isBasicInfoComplete(current);
//   const vehicleOk =
//     steps.vehicleInfoCompleted || isVehicleInfoComplete(current);
//   const docsOk = steps.requiredDocsCompleted || isDocsComplete(current);

//   if (!basicOk || !vehicleOk || !docsOk) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Driver registration is incomplete. Please complete Basic info, Vehicle info and Required docs.",
//     );
//   }

//   const updated = await User.findByIdAndUpdate(
//     id,
//     {
//       $set: {
//         "driverRegistration.applicationStatus": "SUBMITTED",
//         "driverRegistration.submittedAt": new Date(),
//       },
//     },
//     { new: true },
//   );

//   return {
//     message: "Application sent",
//     submittedAt: updated?.driverRegistration?.submittedAt,
//     applicationStatus: updated?.driverRegistration?.applicationStatus,
//   };
// };

// // =========================== Driver Registration End ============================

// // ===========================driver location update+availability update ====================
// const updateDriverLocationToDB = async (
//   user: JwtPayload,
//   payload: { lat: number; lng: number },
// ) => {
//   if (user.role !== USER_ROLES.DRIVER) {
//     throw new ApiError(StatusCodes.FORBIDDEN, "Only driver can update location");
//   }

//   const updated = await User.findByIdAndUpdate(
//     user.id,
//     {
//       $set: {
//         "driverStatus.isOnline": true,
//         "driverStatus.location": {
//           type: "Point",
//           coordinates: [payload.lng, payload.lat],
//         },
//         "driverStatus.locationUpdatedAt": new Date(),
//       },
//     },
//     { new: true },
//   ).select("-password -authentication");

//   return updated;
// };

// const updateDriverAvailabilityToDB = async (
//   user: JwtPayload,
//   payload: { isOnline?: boolean; isAvailable?: boolean },
// ) => {
//   if (user.role !== USER_ROLES.DRIVER) {
//     throw new ApiError(StatusCodes.FORBIDDEN, "Only driver can update availability");
//   }

//   const set: any = {};
//   if (payload.isOnline !== undefined) set["driverStatus.isOnline"] = payload.isOnline;
//   if (payload.isAvailable !== undefined) set["driverStatus.isAvailable"] = payload.isAvailable;

//   const updated = await User.findByIdAndUpdate(
//     user.id,
//     { $set: set },
//     { new: true },
//   ).select("-password -authentication");

//   return updated;
// };


// export const UserService = {
//   createUserToDB,
//   getAdminFromDB,
//   deleteAdminFromDB,
//   getUserProfileFromDB,
//   updateProfileToDB,
//   createAdminToDB,
//   getAllUsersFromDB,
//   getUserByIdFromDB,
//   deleteUserByIdFromD,
//   deleteProfileFromDB,
//   // driver registration
//   getMyDriverRegistrationFromDB,
//   updateDriverBasicInfoToDB,
//   updateDriverVehicleInfoToDB,
//   updateDriverRequiredDocsToDB,
//   updateDriverReferralToDB,
//   submitDriverApplicationToDB,
//   // driver location + availability
//   updateDriverLocationToDB,
//   updateDriverAvailabilityToDB,
//   // profile summary + transactions
//   getProfileSummaryFromDB,
//   getMyTransactionsFromDB,
//   getDriverEarningsFromDB,
// };