import { Router } from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { callSessionControllers } from "./callSession.controller";

const router = Router();

router.post("/initiate", auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER), callSessionControllers.initialCall);
router.post("/accept", auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER), callSessionControllers.acceptCall);
router.post("/reject", auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER), callSessionControllers.rejectCall);
router.post("/end", auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER), callSessionControllers.endCall);
router.get("/active", auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER), callSessionControllers.getActiveCall);

export const callSessionRouters = router;