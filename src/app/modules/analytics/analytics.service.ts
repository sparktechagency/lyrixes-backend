import { STATUS, USER_ROLES } from "../../../enums/user";
import { User } from "../user/user.model";

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

export const AnalyticsServices = {
  getUserStats,
};