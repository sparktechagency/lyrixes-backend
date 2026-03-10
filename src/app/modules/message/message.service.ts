import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { Delivery } from "../delivery/delivery.model";
import { Message } from "./message.model";
import { emitToDelivery, emitToUser } from "../../../helpers/socketHelper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";

const validateDeliveryParticipant = async (
  deliveryId: string,
  userId: string,
) => {
  const delivery = await Delivery.findById(deliveryId)
    .select("customerId selectedDriverId status")
    .lean();

  if (!delivery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  }

  const isCustomer = delivery.customerId.toString() === userId;
  const isDriver = delivery.selectedDriverId?.toString() === userId;

  if (!isCustomer && !isDriver) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not part of this delivery",
    );
  }

  if (!delivery.selectedDriverId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Driver is not selected yet");
  }

  return delivery;
};

const sendMessageToDB = async (user: JwtPayload, payload: any) => {
  const delivery = await validateDeliveryParticipant(payload.deliveryId, user.id);

  const participants = [
    delivery.customerId.toString(),
    delivery.selectedDriverId!.toString(),
  ];

  if (!participants.includes(payload.receiverId)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Invalid receiver for this delivery",
    );
  }

  if (payload.receiverId === user.id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Receiver cannot be sender");
  }

  const message = await Message.create({
    deliveryId: payload.deliveryId,
    senderId: user.id,
    receiverId: payload.receiverId,
    text: payload.text,
    attachments: payload.attachments ?? [],
  });

  const populated = await Message.findById(message._id)
    .populate("senderId", "firstName lastName profileImage")
    .populate("receiverId", "firstName lastName profileImage")
    .lean();

  emitToDelivery(payload.deliveryId, "message:new", populated);
  emitToUser(payload.receiverId, "message:new", populated);

  await sendNotifications({
    receiver: payload.receiverId,
    text:
      payload.text.length > 80
        ? `${payload.text.slice(0, 77)}...`
        : payload.text,
    referenceId: payload.deliveryId,
    type: NOTIFICATION_TYPE.MESSAGE,
    metadata: {
      deliveryId: payload.deliveryId,
      senderId: user.id,
    },
  });

  return populated;
};

const getMessagesFromDB = async (
  user: JwtPayload,
  deliveryId: string,
  query: any,
) => {
  await validateDeliveryParticipant(deliveryId, user.id);

  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 50);
  const skip = (page - 1) * limit;

  const [data, total, unreadCount] = await Promise.all([
    Message.find({ deliveryId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage")
      .lean(),
    Message.countDocuments({ deliveryId }),
    Message.countDocuments({ deliveryId, receiverId: user.id, isRead: false }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
    },
    unreadCount,
    data: data.reverse(),
  };
};

const markMessagesAsReadToDB = async (user: JwtPayload, deliveryId: string) => {
  await validateDeliveryParticipant(deliveryId, user.id);

  const result = await Message.updateMany(
    { deliveryId, receiverId: user.id, isRead: false },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  );

  emitToDelivery(deliveryId, "message:read", {
    deliveryId,
    userId: user.id,
    modifiedCount: result.modifiedCount,
  });

  return result;
};

export const MessageService = {
  sendMessageToDB,
  getMessagesFromDB,
  markMessagesAsReadToDB,
};