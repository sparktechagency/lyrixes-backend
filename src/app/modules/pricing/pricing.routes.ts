import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { PricingValidation } from "./pricing.validation";
import { PricingController } from "./pricing.controller";

const router = express.Router();

router.post(
  "/estimate",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  validateRequest(PricingValidation.estimate),
  PricingController.estimate,
);

// admin config (dashboard)
router.get(
  "/config",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PricingController.getConfig,
);

router.put(
  "/config",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(PricingValidation.upsertConfig),
  PricingController.upsertConfig,
);

export const PricingRoutes = router;