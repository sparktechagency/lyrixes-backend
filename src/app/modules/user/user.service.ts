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
//       "Either email or phone is required"
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
//       name: user.fullName||"User",
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
//   user: JwtPayload
// ): Promise<Partial<IUser>> => {
//   const { id } = user;
//   const isExistUser: any = await User.isExistUserById(id);
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }
//   return isExistUser;
// };

// const updateProfileToDB = async (
//   user: JwtPayload,
//   payload: Partial<IUser>
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
// };

import { STATUS, USER_ROLES } from "../../../enums/user";
import { IUser } from "./user.interface";
import { JwtPayload, Secret } from "jsonwebtoken";
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import QueryBuilder from "../../builder/queryBuilder";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import { twilioService } from "../../../helpers/smsHelper";

// ---------------- Driver registration helpers ----------------
const assertDriver = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  if (user.role !== USER_ROLES.DRIVER) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only driver can access this resource",
    );
  }
  return user;
};

const isBasicInfoComplete = (doc: any) => {
  const dob = doc?.driverRegistration?.basicInfo?.dateOfBirth;
  const addr = doc?.driverRegistration?.basicInfo?.address;
  const hasAddress = !!(addr?.street && addr?.city && addr?.state && addr?.zip);
  return !!dob && hasAddress;
};

const isVehicleInfoComplete = (doc: any) => {
  const v = doc?.driverRegistration?.vehicleInfo;
  const hasImg = Array.isArray(v?.vehicleImage) && v.vehicleImage.length > 0;
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

// const createUserToDB = async (payload: any) => {
//   const createUser = await User.create(payload);
//   console.log(createUser, "Create User");
//   if (!createUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create user");
//   }

//   //send email
//   const otp = generateOTP();
//   const values = {
//     name: createUser.fullName || "User",
//     otp: otp,
//     email: createUser.email!,
//   };

//   const createAccountTemplate = emailTemplate.createAccount(values);
//   emailHelper.sendEmail(createAccountTemplate);

//   //save to DB
//   const authentication = {
//     oneTimeCode: otp,
//     expireAt: new Date(Date.now() + 3 * 60000),
//   };

//   await User.findOneAndUpdate(
//     { _id: createUser._id },
//     { $set: { authentication } }
//   );

//   // const createToken = jwtHelper.createToken(
//   //   {
//   //     id: createUser._id,
//   //     email: createUser.email,
//   //     role: createUser.role,
//   //   },
//   //   config.jwt.jwt_secret as Secret,
//   //   config.jwt.jwt_expire_in as string
//   // );

//   const result = {
//     // token: createToken,
//     user: createUser,
//   };

//   return result;
// };

// ================================= Create USER  ================================

const createUserToDB = async (payload: any) => {
  if (!payload.email && !payload.phone) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Either email or phone is required",
    );
  }

  const user = await User.create(payload);

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create user");
  }

  // ✅ EMAIL REGISTRATION FLOW
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

  // ✅ PHONE REGISTRATION FLOW
  if (user.phone) {
    try {
      await twilioService.sendOTPWithVerify(user.phone, user.countryCode);
    } catch (error: any) {
      // Log the SMS error but don't fail the registration flow
      // so users can still be created even if SMS service issues occur.
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

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //unlink file here
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

const getMyDriverRegistrationFromDB = async (user: JwtPayload) => {
  const { id } = user;
  const doc = await assertDriver(id);
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
    },
    driverRegistration: doc.driverRegistration || {},
  };
};

const updateDriverBasicInfoToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  const doc = await assertDriver(id);

  // unlink profile image if replacing
  if (payload.profileImage && doc.profileImage) {
    unlinkFile(doc.profileImage);
  }

  const updatePayload: any = {};

  // top-level user fields
  [
    "firstName",
    "lastName",
    "email",
    "phone",
    "countryCode",
    "profileImage",
  ].forEach((k) => {
    if (payload?.[k] !== undefined) updatePayload[k] = payload[k];
  });

  // nested driver basic info
  if (payload.dateOfBirth !== undefined) {
    updatePayload["driverRegistration.basicInfo.dateOfBirth"] =
      payload.dateOfBirth;
  }
  if (payload.ssn !== undefined) {
    updatePayload["driverRegistration.basicInfo.ssn"] = payload.ssn;
  }
  if (payload.address !== undefined) {
    Object.entries(payload.address || {}).forEach(([k, v]) => {
      updatePayload[`driverRegistration.basicInfo.address.${k}`] = v;
    });
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true },
  );
  if (!updated)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to update driver basic info",
    );

  const basicOk = isBasicInfoComplete(updated);
  await User.findByIdAndUpdate(id, {
    $set: { "driverRegistration.steps.basicInfoCompleted": basicOk },
  });

  return getMyDriverRegistrationFromDB({ id } as any);
  // 1) steps update করার পর latest user আবার fetch করো (full)
  // const finalUser = await User.findById(id)
  //   .select("-password -authentication") // security
  //   .lean();

  // if (!finalUser) {
  //   throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to load updated user");
  // }

  // return finalUser;
};

 
const updateDriverVehicleInfoToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  const doc = await assertDriver(id);

  const updatePayload: any = {};

  ["vehicleType", "make", "year", "licensePlateNumber", "color"].forEach(
    (k) => {
      if (payload?.[k] !== undefined) {
        updatePayload[`driverRegistration.vehicleInfo.${k}`] = payload[k];
      }
    },
  );

if (payload.vehicleImage) {
  const imagePath = Array.isArray(payload.vehicleImage)
    ? payload.vehicleImage[0]
    : payload.vehicleImage;

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

  if (!updated)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to update driver vehicle info",
    );

  const vehicleOk = isVehicleInfoComplete(updated);

  await User.findByIdAndUpdate(id, {
    $set: { "driverRegistration.steps.vehicleInfoCompleted": vehicleOk },
  });

  // return await User.findById(id).select("-password -authentication").lean();
  return getMyDriverRegistrationFromDB({ id } as any);
};

const updateDriverRequiredDocsToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  const doc = await assertDriver(id);

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
  if (!updated)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to update required documents",
    );

  const docsOk = isDocsComplete(updated);
  await User.findByIdAndUpdate(id, {
    $set: { "driverRegistration.steps.requiredDocsCompleted": docsOk },
  });

  return getMyDriverRegistrationFromDB({ id } as any);
};

const updateDriverReferralToDB = async (user: JwtPayload, payload: any) => {
  const { id } = user;
  await assertDriver(id);
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
  if (!updated)
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update referral");
  return getMyDriverRegistrationFromDB({ id } as any);
};

const submitDriverApplicationToDB = async (user: JwtPayload) => {
  const { id } = user;
  await assertDriver(id);
  const current = await User.findById(id);
  if (!current)
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");

  const steps = current.driverRegistration?.steps || {};
  const basicOk = steps.basicInfoCompleted || isBasicInfoComplete(current);
  const vehicleOk =
    steps.vehicleInfoCompleted || isVehicleInfoComplete(current);
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
        "driverRegistration.applicationStatus": "SUBMITTED",
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

const updateStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: { $in: [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER] },
  });

  if (!user) {
    throw new ApiError(404, "No user is found by this user ID");
  }

  const result = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!result) {
    throw new ApiError(400, "Failed to change status by this user ID");
  }

  return result;
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
  updateStatusByIdToDB,
  // driver registration
  getMyDriverRegistrationFromDB,
  updateDriverBasicInfoToDB,
  updateDriverVehicleInfoToDB,
  updateDriverRequiredDocsToDB,
  updateDriverReferralToDB,
  submitDriverApplicationToDB,
};
