import express from "express";
import { AnalyticsControllers } from "./analytics.controller"
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

const router = express.Router();

router.get("/user-stats", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getAnalytics);

router.get("/all-drivers-details", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getAllDriversDetails);

router.get("/driver-details/:driverId", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getDriverDetails);

router.get("/all-customers-details", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getAllCustomersDetails);

router.get("/customer-details/:customerId", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getCustomerDetails);

router.get("/all-deliveries-details", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getAllDeliveriesDetails);

router.get("/delivery-details/:deliveryId", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getDeliveryDetails);

router.get("/delivery-stats", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AnalyticsControllers.getDeliveryStats);



export const AnalyticsRoutes = router;
