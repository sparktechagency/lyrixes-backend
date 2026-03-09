import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { DeliveryController } from "./delivery.controller";
import { DeliveryValidation } from "./delivery.validation";

const router = express.Router();

const requireCustomer = auth(USER_ROLES.CUSTOMER);
const requireDriver = auth(USER_ROLES.DRIVER);

// customer
router.post("/", requireCustomer, validateRequest(DeliveryValidation.createDelivery), DeliveryController.create);
router.get("/my", requireCustomer, DeliveryController.myDeliveries);

// cencel+update 
router.patch(
  "/:id/change-info",
  requireCustomer,
  validateRequest(DeliveryValidation.changeDeliveryInfo),
  DeliveryController.changeDeliveryInfo,
);

router.patch(
  "/:id/cancel",
  requireCustomer,
  validateRequest(DeliveryValidation.cancelDelivery),
  DeliveryController.cancelDelivery,
);
// optional: customer nearby drivers matches (keep)
router.get("/:id/matches", requireCustomer, validateRequest(DeliveryValidation.matches), DeliveryController.matches);
// ✅ NEW: driver accept OPEN job
router.post("/:id/accept-open", requireDriver, validateRequest(DeliveryValidation.driverAcceptOpen), DeliveryController.driverAcceptOpen);
// ✅ NEW: customer finding couriers list (accept + bids)
router.get("/:id/finding-couriers", requireCustomer, validateRequest(DeliveryValidation.findingCouriers), DeliveryController.findingCouriers);

// ✅ NEW: customer select driver from list
router.post("/:id/select-driver", requireCustomer, validateRequest(DeliveryValidation.selectDriver), DeliveryController.selectDriver);

// ✅ NEW: customer reply bid
router.post("/:id/reply-bid", requireCustomer, validateRequest(DeliveryValidation.replyBid), DeliveryController.replyBid);

// offers list (keep)
router.get("/:id/offers", auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER), DeliveryController.offers);

// payment (keep bookNow for now)
router.post("/book-now", requireCustomer, validateRequest(DeliveryValidation.bookNow), DeliveryController.bookNow);

// driver
router.get("/driver/home", requireDriver, DeliveryController.driverHome);
router.get("/driver/my", requireDriver, DeliveryController.driverMyDeliveries);



// bid (keep)
router.post("/driver/bid", requireDriver, validateRequest(DeliveryValidation.driverBid), DeliveryController.driverBid);

// journey flow
router.post("/:id/start-journey", requireDriver, DeliveryController.startJourney);
router.post(
  "/:id/arrived-pickup",
  requireDriver,
  DeliveryController.arrivedPickup,
);

router.post(
  "/:id/arrived-dropoff",
  requireDriver,
  DeliveryController.arrivedDropoff,
);
router.post("/:id/driver-delivered", requireDriver, DeliveryController.driverDelivered);

// customer confirm
router.post("/:id/confirm-delivered", requireCustomer, DeliveryController.customerConfirm);

// rating (customer rates driver / driver rates customer)
router.post(
  "/:id/rate",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  validateRequest(DeliveryValidation.rateDelivery),
  DeliveryController.rateDelivery,
);
router.patch(
  "/:id/driver-cancel",
  requireDriver,
  DeliveryController.driverCancelDelivery,
);


export const DeliveryRoutes = router;


