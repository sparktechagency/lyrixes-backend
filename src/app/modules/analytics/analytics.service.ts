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
  }).select(
    "firstName lastName fullName email phone profileImage countryCode status driverRegistration.basicInfo.address"
  );

  if (!driver) throw new Error("Driver not found");

  const [ratingInfo, totalDeliveries, earningInfo] = await Promise.all([
    getDriverTotalRating(driverId),
    getDriverTotalDeliveries(driverId),
    getDriverTotalEarnings(driverId),
  ]);

  return {
    info: {
      id: driver._id,
      name: driver.fullName ?? `${driver.firstName} ${driver.lastName}`,
      email: driver.email,
      phone: driver.phone,
      profileImage: driver.profileImage,
      countryCode: driver.countryCode,
      status: driver.status,
      address: driver.driverRegistration?.basicInfo?.address,
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
    User.find({ role: USER_ROLES.DRIVER }), // select() সরিয়ে নিচে দাও
    query
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields(); // এখানে fields() call করো

  // fields() এর আগে manually select force করো
  userQuery.modelQuery = userQuery.modelQuery.select(
    "firstName lastName fullName email phone profileImage countryCode status driverRegistration.basicInfo.address"
  );

  const [drivers, meta] = await Promise.all([
    userQuery.modelQuery,
    userQuery.countTotal(),
  ]);

  if (!drivers.length) return { data: [], meta };

  const driversWithStats = await Promise.all(
    drivers.map(async (driver:any) => {
      const driverId = driver._id.toString();

      const [ratingInfo, totalDeliveries, earningInfo] = await Promise.all([
        getDriverTotalRating(driverId),
        getDriverTotalDeliveries(driverId),
        getDriverTotalEarnings(driverId),
      ]);

      return {
        info: {
          id: driver._id,
          name: driver.fullName ?? `${driver.firstName} ${driver.lastName}`,
          email: driver.email,
          phone: driver.phone,
          profileImage: driver.profileImage,
          countryCode: driver.countryCode,
          status: driver.status,
          address: driver.driverRegistration?.basicInfo?.address,
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
    "firstName lastName fullName email phone profileImage countryCode status"
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
      name: customer.fullName ?? `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      profileImage: customer.profileImage,
      countryCode: customer.countryCode,
      status: customer.status,
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
    "firstName lastName fullName email phone profileImage countryCode status"
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
          name: customer.fullName ?? `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone,
          profileImage: customer.profileImage,
          countryCode: customer.countryCode,
          status: customer.status,
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
          amount: transaction.amount,
          currency: transaction.currency,
          method: transaction.method,
          status: transaction.status,
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
  }).select("amount currency method status");

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
      }).select("amount currency method status");

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



export const AnalyticsServices = {
  getUserStats,
  getDriverDetailsService,
  getAllDriversDetailsService,
  getCustomerDetailsService,
  getAllCustomersDetailsService,
  getDeliveryDetailsService,
  getAllDeliveriesDetailsService,
  getDeliveryStatsService,
};