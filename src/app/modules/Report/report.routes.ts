import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";

const router = express.Router();

// customer/driver report করতে পারবে
router.post(
  "/user",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  validateRequest(ReportValidation.createReport),
  ReportController.createReport,
);

// admin reports দেখবে
router.get(
  "/",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReportController.getAllReports,
);

router.get(
  "/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(ReportValidation.getSingleReport),
  ReportController.getSingleReport,
);

router.patch(
  "/:id/review",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(ReportValidation.updateReportStatus),
  ReportController.updateReportStatus,
);

export const ReportRoutes = router;