import { JwtPayload } from "jsonwebtoken";
import { Notification } from "./notification.model";
import { emitToUser } from "../../../helpers/socketHelper";

const getNotificationFromDB = async (user: JwtPayload) => {
  const result = await Notification.find({ receiver: user.id })
    .sort({ createdAt: -1 })
    .lean();

  const unreadCount = await Notification.countDocuments({
    receiver: user.id,
    read: false,
  });

  return {
    result,
    unreadCount,
  };
};

const readNotificationToDB = async (user: JwtPayload) => {
  const result = await Notification.updateMany(
    { receiver: user.id, read: false },
    { $set: { read: true } },
  );

  emitToUser(user.id, "notification:read-all", {
    unreadCount: 0,
  });

  return result;
};

const adminNotificationFromDB = async () => {
  return Notification.find({ type: "ADMIN" }).sort({ createdAt: -1 }).lean();
};

const adminReadNotificationToDB = async () => {
  return Notification.updateMany(
    { type: "ADMIN", read: false },
    { $set: { read: true } },
  );
};

export const NotificationService = {
  adminNotificationFromDB,
  getNotificationFromDB,
  readNotificationToDB,
  adminReadNotificationToDB,
};