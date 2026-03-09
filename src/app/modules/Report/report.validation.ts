import { z } from "zod";
import { REPORT_REASON, REPORT_STATUS } from "./report.interface";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const ReportValidation = {
  createReport: z.object({
    body: z.object({
      reportedUserId: objectIdSchema,
      reason: z.nativeEnum(REPORT_REASON),
      note: z.string().trim().max(500).optional(),
    }),
  }),

  getSingleReport: z.object({
    params: z.object({
      id: objectIdSchema,
    }),
  }),

  updateReportStatus: z.object({
    params: z.object({
      id: objectIdSchema,
    }),
    body: z.object({
      status: z.nativeEnum(REPORT_STATUS),
      adminNote: z.string().trim().max(1000).optional(),
    }),
  }),
};