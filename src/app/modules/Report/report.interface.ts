import { Model, Types } from "mongoose";

export enum REPORT_REASON {
  SPAM = "SPAM",
  HARASSMENT = "HARASSMENT",
  OFFENSIVE = "OFFENSIVE",
  IMPERSONATION = "IMPERSONATION",
  OTHER = "OTHER",
}

export enum REPORT_STATUS {
  PENDING = "PENDING",
  REVIEWED = "REVIEWED",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

export type IReport = {
  reporterId: Types.ObjectId;
  reportedUserId: Types.ObjectId;
  reason: REPORT_REASON;
  note?: string | null;

  status: REPORT_STATUS;

  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  adminNote?: string | null;
};

export type ReportModel = Model<IReport>;