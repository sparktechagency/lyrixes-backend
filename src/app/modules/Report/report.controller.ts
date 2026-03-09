import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReportService } from "./report.service";

export const ReportController = {
  createReport: catchAsync(async (req, res) => {
    const result = await ReportService.createReportToDB(
      req.user as JwtPayload,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Report submitted successfully",
      data: result,
    });
  }),

  getAllReports: catchAsync(async (req, res) => {
    const result = await ReportService.getAllReportsFromDB(req.query);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Reports retrieved successfully",
      data: result,
    });
  }),

  getSingleReport: catchAsync(async (req, res) => {
    const result = await ReportService.getSingleReportFromDB(req.params.id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Report retrieved successfully",
      data: result,
    });
  }),

  updateReportStatus: catchAsync(async (req, res) => {
    const result = await ReportService.updateReportStatusToDB(
      req.user as JwtPayload,
      req.params.id,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Report updated successfully",
      data: result,
    });
  }),
};