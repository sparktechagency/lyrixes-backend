import { Router } from "express";
import { GeneralSettingsControllers } from "./generalSettings.controller";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";

const router = Router();

router.route("/")
    .post(auth(USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN),GeneralSettingsControllers.createSettings)
    .put(auth(USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN),GeneralSettingsControllers.updateSettings)
    .get(GeneralSettingsControllers.getSettings);

export const GeneralSettingsRoutes = router;