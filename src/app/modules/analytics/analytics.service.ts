import { Types } from "mongoose";
import { STATUS, USER_ROLES } from "../../../enums/user";
import { Delivery } from "../delivery/delivery.model";
import { User } from "../user/user.model";
import { DELIVERY_STATUS } from "../delivery/delivery.interface";
import { Transaction } from "../payment/transaction.model";
import QueryBuilder from "../../builder/queryBuilder";

const getUserStats = async () => {
  const stats = await User.aggregate([
    {
      $match: {
        role: { $in: [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER] },
      },
    },
    {
      $group: {
        _id: { role: "$role", status: "$status" },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    customers: { total: 0, active: 0, inactive: 0 },
    drivers: { total: 0, active: 0, inactive: 0 },
  };

  for (const stat of stats) {
    const key = stat._id.role === USER_ROLES.CUSTOMER ? "customers" : "drivers";
    const count = stat.count;

    result[key].total += count;

    if (stat._id.status === STATUS.ACTIVE) {
      result[key].active += count;
    } else if (stat._id.status === STATUS.INACTIVE) {
      result[key].inactive += count;
    }
  }

  return result;
};

// driver management
// -------------------- Reusable Helpers --------------------

const getDriverTotalRating = async (driverId: string) => {
  const result = await Delivery.aggregate([
    {
      $match: {
        selectedDriverId: new Types.ObjectId(driverId),
        "rating.customerToDriver.stars": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        totalRatings: { $sum: 1 },
        averageRating: { $avg: "$rating.customerToDriver.stars" },
      },
    },
  ]);

  return {
    totalRatings: result[0]?.totalRatings ?? 0,
    averageRating: result[0]
      ? parseFloat(result[0].averageRating.toFixed(1))
      : 0,
  };
};

const getDriverTotalDeliveries = async (driverId: string) => {
  return await Delivery.countDocuments({
    selectedDriverId: new Types.ObjectId(driverId),
    status: { $in: [DELIVERY_STATUS.PAYOUT_DONE, DELIVERY_STATUS.DELIVERED_CONFIRMED] },
  });
};

const getDriverTotalEarnings = async (driverId: string) => {
  const result = await Transaction.aggregate([
    {
      $match: {
        driverId: new Types.ObjectId(driverId),
        payoutStatus: "SUCCEEDED",
      },
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: "$driverReceiptAmount" },
        currency: { $first: "$currency" },
      },
    },
  ]);

  return {
    totalEarnings: result[0]?.totalEarnings ?? 0,
    currency: result[0]?.currency ?? "usd",
  };
};

// -------------------- Main Service --------------------
const getDriverDetailsService = async (driverId: string) => {
  const driver = await User.findOne({
    _id: driverId,
    role: USER_ROLES.DRIVER,
  });

  if (!driver) throw new Error("Driver not found");

  const [ratingInfo, totalDeliveries, earningInfo] = await Promise.all([
    getDriverTotalRating(driverId),
    getDriverTotalDeliveries(driverId),
    getDriverTotalEarnings(driverId),
  ]);

  return {
    info: {
      id: driver._id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      fullName: driver.fullName ?? `${driver.firstName} ${driver.lastName}`,
      email: driver.email,
      countryCode: driver.countryCode,
      phone: driver.phone,
      profileImage: driver.profileImage,
      status: driver.status,
      createdAt: driver.createdAt,

      basicInfo: {
        ssn: driver.driverRegistration?.basicInfo?.ssn,
        dateOfBirth: driver.driverRegistration?.basicInfo?.dateOfBirth,
        address: driver.driverRegistration?.basicInfo?.address,
      },

      vehicleInfo: {
        vehicleType: driver.driverRegistration?.vehicleInfo?.vehicleType,
        make: driver.driverRegistration?.vehicleInfo?.make,
        year: driver.driverRegistration?.vehicleInfo?.year,
        licensePlateNumber: driver.driverRegistration?.vehicleInfo?.licensePlateNumber,
        color: driver.driverRegistration?.vehicleInfo?.color,
        vehicleImage: driver.driverRegistration?.vehicleInfo?.vehicleImage,
      },

      requiredDocs: {
        vehicleRegistrationDoc: driver.driverRegistration?.requiredDocs?.vehicleRegistrationDoc,
        stateIdDoc: driver.driverRegistration?.requiredDocs?.stateIdDoc,
        driversLicenseDoc: driver.driverRegistration?.requiredDocs?.driversLicenseDoc,
        ssnDoc: driver.driverRegistration?.requiredDocs?.ssnDoc,
        insuranceDoc: driver.driverRegistration?.requiredDocs?.insuranceDoc,
      },

      applicationStatus: driver.driverRegistration?.applicationStatus,
    },

    stats: {
      totalDeliveries,
      rating: ratingInfo,
      earnings: earningInfo,
    },
  };
};


const getAllDriversDetailsService = async (query: Record<string, any>) => {
  const searchableFields = ["fullName", "firstName", "lastName", "email", "phone"];

  const userQuery = new QueryBuilder(
    User.find({ role: USER_ROLES.DRIVER }),
    query
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate();

  const [drivers, meta] = await Promise.all([
    userQuery.modelQuery,
    userQuery.countTotal(),
  ]);

  if (!drivers.length) return { data: [], meta };

  const driversWithStats = await Promise.all(
    drivers.map(async (driver: any) => {
      const driverId = driver._id.toString();

      const [ratingInfo, totalDeliveries, earningInfo] = await Promise.all([
        getDriverTotalRating(driverId),
        getDriverTotalDeliveries(driverId),
        getDriverTotalEarnings(driverId),
      ]);

      return {
        info: {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          fullName: driver.fullName ?? `${driver.firstName} ${driver.lastName}`,
          email: driver.email,
          countryCode: driver.countryCode,
          phone: driver.phone,
          profileImage: driver.profileImage,
          status: driver.status,
          createdAt: driver.createdAt,

          basicInfo: {
            ssn: driver.driverRegistration?.basicInfo?.ssn,
            dateOfBirth: driver.driverRegistration?.basicInfo?.dateOfBirth,
            address: driver.driverRegistration?.basicInfo?.address,
          },

          vehicleInfo: {
            vehicleType: driver.driverRegistration?.vehicleInfo?.vehicleType,
            make: driver.driverRegistration?.vehicleInfo?.make,
            year: driver.driverRegistration?.vehicleInfo?.year,
            licensePlateNumber: driver.driverRegistration?.vehicleInfo?.licensePlateNumber,
            color: driver.driverRegistration?.vehicleInfo?.color,
            vehicleImage: driver.driverRegistration?.vehicleInfo?.vehicleImage,
          },

          requiredDocs: {
            vehicleRegistrationDoc: driver.driverRegistration?.requiredDocs?.vehicleRegistrationDoc,
            stateIdDoc: driver.driverRegistration?.requiredDocs?.stateIdDoc,
            driversLicenseDoc: driver.driverRegistration?.requiredDocs?.driversLicenseDoc,
            ssnDoc: driver.driverRegistration?.requiredDocs?.ssnDoc,
            insuranceDoc: driver.driverRegistration?.requiredDocs?.insuranceDoc,
          },

          applicationStatus: driver.driverRegistration?.applicationStatus,
        },

        stats: {
          totalDeliveries,
          rating: ratingInfo,
          earnings: earningInfo,
        },
      };
    })
  );

  return { data: driversWithStats, meta };
};

// -------------------- Customer Helpers --------------------

const getCustomerTotalDeliveries = async (customerId: string) => {
  return await Delivery.countDocuments({
    customerId: new Types.ObjectId(customerId),
    status: { $in: [DELIVERY_STATUS.PAYOUT_DONE, DELIVERY_STATUS.DELIVERED_CONFIRMED] },
  });
};

const getCustomerTotalSpent = async (customerId: string) => {
  const result = await Transaction.aggregate([
    {
      $match: {
        customerId: new Types.ObjectId(customerId),
        status: "SUCCEEDED",
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$amount" },
        currency: { $first: "$currency" },
      },
    },
  ]);

  return {
    totalSpent: result[0]?.totalSpent ?? 0,
    currency: result[0]?.currency ?? "usd",
  };
};

const getCustomerLastOrderDate = async (customerId: string) => {
  const lastDelivery = await Delivery.findOne({
    customerId: new Types.ObjectId(customerId),
    status: { $in: [DELIVERY_STATUS.PAYOUT_DONE, DELIVERY_STATUS.DELIVERED_CONFIRMED] },
  })
    .sort({ createdAt: -1 })
    .select("createdAt");

  if (!lastDelivery) return { lastOrderAt: null, daysAgo: null };

  const now = new Date();
  const lastOrderAt = lastDelivery.createdAt as Date;
  const daysAgo = Math.floor(
    (now.getTime() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { lastOrderAt, daysAgo };
};

// -------------------- Single Customer --------------------

const getCustomerDetailsService = async (customerId: string) => {
  const customer = await User.findOne({
    _id: customerId,
    role: USER_ROLES.CUSTOMER,
  }).select(
    "firstName lastName fullName email phone profileImage countryCode status createdAt"
  );

  if (!customer) throw new Error("Customer not found");

  const [totalDeliveries, spentInfo, lastOrderInfo] = await Promise.all([
    getCustomerTotalDeliveries(customerId),
    getCustomerTotalSpent(customerId),
    getCustomerLastOrderDate(customerId),
  ]);

  return {
    info: {
      id: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      fullName: customer.fullName ?? `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      profileImage: customer.profileImage,
      countryCode: customer.countryCode,
      status: customer.status,
      createdAt: customer.createdAt,
    },
    stats: {
      totalDeliveries,
      spent: spentInfo,
      lastOrder: lastOrderInfo,
    },
  };
};

// -------------------- All Customers --------------------

const getAllCustomersDetailsService = async (query: Record<string, any>) => {
  const searchableFields = ["fullName", "firstName", "lastName", "email", "phone"];

  const userQuery = new QueryBuilder(
    User.find({ role: USER_ROLES.CUSTOMER }),
    query
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate();

  userQuery.modelQuery = userQuery.modelQuery.select(
    "firstName lastName fullName email phone profileImage countryCode status createdAt"
  );

  const [customers, meta] = await Promise.all([
    userQuery.modelQuery,
    userQuery.countTotal(),
  ]);

  if (!customers.length) return { data: [], meta };

  const customersWithStats = await Promise.all(
    customers.map(async (customer: any) => {
      const customerId = customer._id.toString();

      const [totalDeliveries, spentInfo, lastOrderInfo] = await Promise.all([
        getCustomerTotalDeliveries(customerId),
        getCustomerTotalSpent(customerId),
        getCustomerLastOrderDate(customerId),
      ]);

      return {
        info: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: customer.fullName ?? `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone,
          profileImage: customer.profileImage,
          countryCode: customer.countryCode,
          status: customer.status,
          createdAt: customer.createdAt,
        },
        stats: {
          totalDeliveries,
          spent: spentInfo,
          lastOrder: lastOrderInfo,
        },
      };
    })
  );

  return { data: customersWithStats, meta };
};

// -------------------- Reusable Formatter --------------------

const formatDelivery = (delivery: any, transaction: any) => {
  const customer = delivery.customerId as any;
  const driver = delivery.selectedDriverId as any;

  return {
    id: delivery._id,

    customer: customer
      ? {
          id: customer._id,
          name: customer.fullName ?? `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone,
          profileImage: customer.profileImage,
          countryCode: customer.countryCode,
          status: customer.status,
        }
      : null,

    driver: driver
      ? {
          id: driver._id,
          name: driver.fullName ?? `${driver.firstName} ${driver.lastName}`,
          email: driver.email,
          phone: driver.phone,
          profileImage: driver.profileImage,
          countryCode: driver.countryCode,
          status: driver.status,
        }
      : null,

    route: {
      pickup: {
        address: delivery.pickup.address,
        coordinates: delivery.pickup.point.coordinates,
      },
      dropoff: {
        address: delivery.dropoff.address,
        coordinates: delivery.dropoff.point.coordinates,
      },
      distanceKm: delivery.pricing.distanceKm,
    },

    parcel: {
      type: delivery.parcel.type,
      size: delivery.parcel.size,
      weightKg: delivery.parcel.weightKg,
      description: delivery.parcel.description,
      isFragile: delivery.parcel.isFragile,
      isLiquid: delivery.parcel.isLiquid,
      isValuable: delivery.parcel.isValuable,
      photos: delivery.parcel.photos,
    },

    vehicle: delivery.vehicleType,

    payment: transaction
      ? {
          id: transaction._id,
          deliveryId: transaction.deliveryId,
          transactionId: transaction.stripePaymentIntentId,
          stripeChargeId: transaction.stripeChargeId,
          amount: transaction.amount,
          currency: transaction.currency,
          method: transaction.method,
          commissionAmount: transaction.commissionAmount,
          commissionRate: transaction.commissionRate,
          driverReceiptAmount: transaction.driverReceiptAmount,
          status: transaction.status,
          payoutStatus: transaction.payoutStatus,
          payoutAt: transaction.payoutAt,
          createdAt: transaction.createdAt,
        }
      : null,

    status: delivery.status,
    createdAt: delivery.createdAt,
  };
};

// -------------------- Single Delivery --------------------

const getDeliveryDetailsService = async (deliveryId: string) => {
  const delivery = await Delivery.findById(deliveryId)
    .populate({
      path: "customerId",
      select: "firstName lastName fullName email phone profileImage countryCode status",
    })
    .populate({
      path: "selectedDriverId",
      select: "firstName lastName fullName email phone profileImage countryCode status",
    });

  if (!delivery) throw new Error("Delivery not found");

  const transaction = await Transaction.findOne({
    deliveryId: new Types.ObjectId(deliveryId),
    status: "SUCCEEDED",
  })

  return formatDelivery(delivery, transaction);
};

// -------------------- All Deliveries --------------------

const getAllDeliveriesDetailsService = async (query: Record<string, any>) => {
  const deliveryQuery = new QueryBuilder(
    Delivery.find()
      .populate({
        path: "customerId",
        select: "firstName lastName fullName email phone profileImage countryCode status",
      })
      .populate({
        path: "selectedDriverId",
        select: "firstName lastName fullName email phone profileImage countryCode status",
      }),
    query
  )
    .filter()
    .sort()
    .paginate();

  const [deliveries, meta] = await Promise.all([
    deliveryQuery.modelQuery,
    deliveryQuery.countTotal(),
  ]);

  if (!deliveries.length) return { data: [], meta };

  const deliveriesWithDetails = await Promise.all(
    deliveries.map(async (delivery: any) => {
      const transaction = await Transaction.findOne({
        deliveryId: delivery._id,
        status: "SUCCEEDED",
      })

      return formatDelivery(delivery, transaction);
    })
  );

  return { data: deliveriesWithDetails, meta };
};

const getDeliveryStatsService = async () => {
  const stats = await Delivery.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const statusMap: Record<string, number> = {};
  stats.forEach((s) => {
    statusMap[s._id] = s.count;
  });

  const pendingStatuses = [
    DELIVERY_STATUS.OPEN,
    DELIVERY_STATUS.REQUESTED,
    DELIVERY_STATUS.BID_SENT,
    DELIVERY_STATUS.ACCEPTED,
    DELIVERY_STATUS.PAYMENT_PENDING,
    DELIVERY_STATUS.PAID,
  ];

  const inProgressStatuses = [
    DELIVERY_STATUS.IN_DELIVERY,
    DELIVERY_STATUS.DELIVERED_BY_DRIVER,
  ];

  const completedStatuses = [
    DELIVERY_STATUS.DELIVERED_CONFIRMED,
    DELIVERY_STATUS.PAYOUT_DONE,
  ];

  const canceledStatuses = [
    DELIVERY_STATUS.CANCELLED,
    DELIVERY_STATUS.CANCELLED_BY_DRIVER,
  ];

  const sumStatuses = (statuses: DELIVERY_STATUS[]) =>
    statuses.reduce((acc, status) => acc + (statusMap[status] ?? 0), 0);

  const totalPending = sumStatuses(pendingStatuses);
  const totalInProgress = sumStatuses(inProgressStatuses);
  const totalCompleted = sumStatuses(completedStatuses);
  const totalCanceled = sumStatuses(canceledStatuses);
  const totalDeliveries = totalPending + totalInProgress + totalCompleted + totalCanceled;

  return {
    totalDeliveries,
    totalPending,
    totalInProgress,
    totalCompleted,
    totalCanceled,
  };
};

// -------------------- Reusable Formatter --------------------

const formatTransaction = (transaction: any) => {
  const customer = transaction.customerId as any;
  const driver = transaction.driverId as any;

  return {
    id: transaction._id,
    deliveryId: transaction.deliveryId,

    customer: customer
      ? {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: customer.fullName ?? `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone,
          profileImage: customer.profileImage,
          countryCode: customer.countryCode,
          status: customer.status,
          createdAt: customer.createdAt,
        }
      : null,

    driver: driver
      ? {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          fullName: driver.fullName ?? `${driver.firstName} ${driver.lastName}`,
          email: driver.email,
          phone: driver.phone,
          profileImage: driver.profileImage,
          countryCode: driver.countryCode,
          status: driver.status,
          createdAt: driver.createdAt,
        }
      : null,

    payment: {
      transactionId: transaction.stripePaymentIntentId,
      stripeChargeId: transaction.stripeChargeId,
      stripeSessionId: transaction.stripeSessionId,
      method: transaction.method,
      currency: transaction.currency,
      totalAmount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
    },

    commission: {
      commissionRate: transaction.commissionRate,
      adminAmount: transaction.commissionAmount,
      driverAmount: transaction.driverReceiptAmount,
    },

    payout: {
      status: transaction.payoutStatus,
      stripeTransferId: transaction.stripeTransferId,
      payoutAt: transaction.payoutAt,
    },

    date: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
};

// -------------------- Single Transaction --------------------

const getTransactionDetailsService = async (transactionId: string) => {
  const transaction = await Transaction.findById(transactionId)
    .populate({
      path: "customerId",
      select: "firstName lastName fullName email phone profileImage countryCode status",
    })
    .populate({
      path: "driverId",
      select: "firstName lastName fullName email phone profileImage countryCode status",
    });

  if (!transaction) throw new Error("Transaction not found");

  return formatTransaction(transaction);
};

// -------------------- All Transactions --------------------

const getAllTransactionsDetailsService = async (query: Record<string, any>) => {
  const transactionQuery = new QueryBuilder(
    Transaction.find()
      .populate({
        path: "customerId",
        select: "firstName lastName fullName email phone profileImage countryCode status",
      })
      .populate({
        path: "driverId",
        select: "firstName lastName fullName email phone profileImage countryCode status",
      }),
    query
  )
    .filter()
    .sort()
    .paginate();

  const [transactions, meta] = await Promise.all([
    transactionQuery.modelQuery,
    transactionQuery.countTotal(),
  ]);

  if (!transactions.length) return { data: [], meta };

  return {
    data: transactions.map((transaction: any) => formatTransaction(transaction)),
    meta,
  };
};

const getTransactionStatsService = async () => {
  const stats = await Transaction.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const statusMap: Record<string, { count: number; totalAmount: number }> = {};
  stats.forEach((s) => {
    statusMap[s._id] = { count: s.count, totalAmount: s.totalAmount };
  });

  return {
    total: {
      count: stats.reduce((acc, s) => acc + s.count, 0),
      amount: stats.reduce((acc, s) => acc + s.totalAmount, 0),
    },
    completed: {
      count: statusMap["SUCCEEDED"]?.count ?? 0,
      amount: statusMap["SUCCEEDED"]?.totalAmount ?? 0,
    },
    inProgress: {
      count: statusMap["PENDING"]?.count ?? 0,
      amount: statusMap["PENDING"]?.totalAmount ?? 0,
    },
    failed: {
      count: statusMap["FAILED"]?.count ?? 0,
      amount: statusMap["FAILED"]?.totalAmount ?? 0,
    },
  };
};

const getDashboardStatsService = async () => {
  const [
    totalRevenue,
    activeDrivers,
    totalCustomers,
    totalSuccessfulDeliveries,
  ] = await Promise.all([
    // Admin total revenue (commission amount)
    Transaction.aggregate([
      { $match: { status: "SUCCEEDED" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$commissionAmount" },
          currency: { $first: "$currency" },
        },
      },
    ]),

    // Active drivers
    User.countDocuments({
      role: USER_ROLES.DRIVER,
      status: "ACTIVE",
    }),

    // Total customers
    User.countDocuments({
      role: USER_ROLES.CUSTOMER,
      status: "ACTIVE",
    }),

    // Total successful deliveries
    Delivery.countDocuments({
      status: { $in: [DELIVERY_STATUS.DELIVERED_CONFIRMED, DELIVERY_STATUS.PAYOUT_DONE] },
    }),
  ]);

  return {
    totalRevenue: {
      amount: totalRevenue[0]?.totalRevenue ?? 0,
      currency: totalRevenue[0]?.currency ?? "usd",
    },
    activeDrivers,
    totalCustomers,
    totalSuccessfulDeliveries,
  };
};

const getMonthlyStatsService = async (query: Record<string, any>) => {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const year = Number(query.year) || new Date().getFullYear();

  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const [revenueStats, deliveryStats] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          status: "SUCCEEDED",
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          totalRevenue: { $sum: "$commissionAmount" },
          currency: { $first: "$currency" },
        },
      },
    ]),

    Delivery.aggregate([
      {
        $match: {
          status: { $in: [DELIVERY_STATUS.DELIVERED_CONFIRMED, DELIVERY_STATUS.PAYOUT_DONE] },
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          totalDeliveries: { $sum: 1 },
        },
      },
    ]),
  ]);

  // revenue map by month index
  const revenueMap: Record<number, { revenue: number; currency: string }> = {};
  revenueStats.forEach((s) => {
    revenueMap[s._id.month] = {
      revenue: s.totalRevenue,
      currency: s.currency,
    };
  });

  // delivery map by month index
  const deliveryMap: Record<number, number> = {};
  deliveryStats.forEach((s) => {
    deliveryMap[s._id.month] = s.totalDeliveries;
  });

  // build full 12 months — missing months will have 0
  const result = monthNames.map((month, index) => {
    const monthIndex = index + 1;
    return {
      month,
      year,
      revenue: revenueMap[monthIndex]?.revenue ?? 0,
      currency: revenueMap[monthIndex]?.currency ?? "usd",
      deliveries: deliveryMap[monthIndex] ?? 0,
    };
  });

  return result;
};


export const AnalyticsServices = {
  getUserStats,
  getDriverDetailsService,
  getAllDriversDetailsService,
  getCustomerDetailsService,
  getAllCustomersDetailsService,
  getDeliveryDetailsService,
  getAllDeliveriesDetailsService,
  getDeliveryStatsService,
  getTransactionDetailsService,
  getAllTransactionsDetailsService,
  getTransactionStatsService,
  getDashboardStatsService,
  getMonthlyStatsService,
};