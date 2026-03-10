import { model, Schema } from "mongoose";
import { INotification, NotificationModel } from "./notification.interface";
import { NOTIFICATION_TYPE } from "./notification.constant";

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referenceId: {
      type: String,
      required: false,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationSchema.index({ receiver: 1, createdAt: -1 });
notificationSchema.index({ receiver: 1, read: 1 });

export const Notification = model<INotification, NotificationModel>(
  "Notification",
  notificationSchema,
);