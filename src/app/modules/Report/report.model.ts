import { Schema, model } from "mongoose";
import { IReport, REPORT_REASON, REPORT_STATUS, ReportModel } from "./report.interface";

const reportSchema = new Schema<IReport, ReportModel>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(REPORT_REASON),
      required: true,
    },
    note: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.PENDING,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// same reporter একই user কে বারবার identical pending report না দিতে পারে
reportSchema.index(
  { reporterId: 1, reportedUserId: 1, status: 1 },
  {
    partialFilterExpression: {
      status: REPORT_STATUS.PENDING,
    },
  },
);

export const Report = model<IReport, ReportModel>("Report", reportSchema);