import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { USER_ROLES } from "../../../enums/user";
import { User } from "../user/user.model";
import { Report } from "./report.model";
import { REPORT_STATUS } from "./report.interface";

const createReportToDB = async (user: JwtPayload, payload: any) => {
  const reporterId = user.id;
  const { reportedUserId, reason, note } = payload;

  if (reporterId === reportedUserId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot report yourself");
  }

  const reportedUser = await User.findById(reportedUserId);
  if (!reportedUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Reported user not found");
  }

  const alreadyPending = await Report.findOne({
    reporterId,
    reportedUserId,
    status: REPORT_STATUS.PENDING,
  });

  if (alreadyPending) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You already submitted a pending report for this user",
    );
  }

  const report = await Report.create({
    reporterId,
    reportedUserId,
    reason,
    note: note ?? null,
  });

  return report;
};

const getAllReportsFromDB = async (query: any) => {
  const baseQuery = Report.find()
    .populate("reporterId", "firstName lastName fullName email role profileImage")
    .populate("reportedUserId", "firstName lastName fullName email role profileImage")
    .populate("reviewedBy", "firstName lastName fullName email role");

  const qb = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .fields()
    .paginate();

  const data = await qb.modelQuery;
  const meta = await qb.countTotal();

  return { meta, data };
};

const getSingleReportFromDB = async (id: string) => {
  const report = await Report.findById(id)
    .populate("reporterId", "firstName lastName fullName email role profileImage")
    .populate("reportedUserId", "firstName lastName fullName email role profileImage")
    .populate("reviewedBy", "firstName lastName fullName email role");

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found");
  }

  return report;
};

const updateReportStatusToDB = async (
  user: JwtPayload,
  id: string,
  payload: { status: REPORT_STATUS; adminNote?: string },
) => {
  if (![USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any)) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only admin can review reports");
  }

  const report = await Report.findById(id);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found");
  }

  report.status = payload.status;
  report.adminNote = payload.adminNote ?? null;
  report.reviewedBy = user.id as any;
  report.reviewedAt = new Date();

  await report.save();

  return report;
};

export const ReportService = {
  createReportToDB,
  getAllReportsFromDB,
  getSingleReportFromDB,
  updateReportStatusToDB,
};