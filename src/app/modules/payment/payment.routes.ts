import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { PaymentController } from "./payment.controller";

const router = express.Router();

router.post("/delivery/checkout", auth(USER_ROLES.CUSTOMER), PaymentController.deliveryCheckout);

// ⚠️ webhook raw body route must be mounted with raw middleware in main app
router.post("/stripe/webhook", PaymentController.stripeWebhook);

router.post("/admin/payout", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), PaymentController.adminPayout);

export const PaymentRoutes = router;
