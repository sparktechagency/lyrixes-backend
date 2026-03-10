import { Model, Types } from "mongoose";

export type IMessageAttachment = {
  url: string;
  type?: string;
};

export type IMessage = {
  deliveryId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  text: string;
  attachments?: IMessageAttachment[];
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type MessageModel = Model<IMessage>;