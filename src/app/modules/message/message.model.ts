import { model, Schema } from "mongoose";
import { IMessage, MessageModel } from "./message.interface";

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, default: null },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage, MessageModel>(
  {
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: "Delivery",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

messageSchema.index({ deliveryId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

export const Message = model<IMessage, MessageModel>("Message", messageSchema);