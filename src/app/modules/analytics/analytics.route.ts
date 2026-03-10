import express from "express";
import { AnalyticsControllers } from "./analytics.controller"
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

const router = express.Router();

router.get("/user-stats", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getAnalytics);

export const AnalyticsRoutes = router;
