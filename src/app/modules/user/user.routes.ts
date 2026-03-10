// import { FOLDER_NAMES } from "./../../../enums/files";
// import express from "express";
// import { USER_ROLES } from "../../../enums/user";
// import { UserController } from "./user.controller";
// import { UserValidation } from "./user.validation";
// import auth from "../../middlewares/auth";
// import validateRequest from "../../middlewares/validateRequest";
// import fileUploadHandler from "../../middlewares/fileUploaderHandler";
// import parseAllFilesData from "../../middlewares/parseAllFileData";

// const router = express.Router();

// const requireAdminOrSuperAdmin = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);
// const requireSuperAdmin = auth(USER_ROLES.SUPER_ADMIN);
// const requireUser = auth(USER_ROLES.CUSTOMER);
// const requireAnyUser = auth(
//   USER_ROLES.ADMIN,
//   USER_ROLES.SUPER_ADMIN,
//   USER_ROLES.CUSTOMER,
// );
// const AdminOrUser = auth(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER);

// /* ---------------------------- PROFILE ROUTES ---------------------------- */
// router
//   .route("/profile")
//   .get(requireAnyUser, UserController.getUserProfile)
//   .delete(AdminOrUser, UserController.deleteProfile);

// /* ---------------------------- ADMIN CREATE ------------------------------ */
// router.post(
//   "/create-admin",requireSuperAdmin,
//   validateRequest(UserValidation.createAdminZodSchema),
//   UserController.createAdmin,
// );

 

// /* ---------------------------- ADMINS LIST ------------------------------- */
// router.get("/admins", requireSuperAdmin, UserController.getAdmin);
// router.delete("/admins/:id", requireSuperAdmin, UserController.deleteAdmin);

 
 

// /* ---------------------------- USER CREATE & UPDATE ---------------------- */
// router
//   .route("/")
//   .post(UserController.createUser)
//   .patch(
//     requireAnyUser,
//     fileUploadHandler(),
//     parseAllFilesData({
//       fieldName: FOLDER_NAMES.PROFILE_IMAGE,
//       forceSingle: true,
//     }),
//     UserController.updateProfile,
//   )
//   .get(
//     auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
//     UserController.getAllUsers,
//   );

 
 
// /* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
// router
//   .route("/:id")
//   .get(requireAdminOrSuperAdmin, UserController.getUserById)
//   .delete(requireAdminOrSuperAdmin, UserController.deleteUserById);

// export const UserRoutes = router;

import { FOLDER_NAMES } from "./../../../enums/files";
import express from "express";
import { USER_ROLES } from "../../../enums/user";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";

const router = express.Router();

const requireAdminOrSuperAdmin = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);
const requireSuperAdmin = auth(USER_ROLES.SUPER_ADMIN);
const requireUser = auth(USER_ROLES.CUSTOMER);
const requireDriver = auth(USER_ROLES.DRIVER);
const requireAnyUser = auth(
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.CUSTOMER,
  USER_ROLES.DRIVER,
);
const AdminOrUser = auth(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER);

/* ---------------------------- PROFILE ROUTES ---------------------------- */
router
  .route("/profile")
  .get(requireAnyUser, UserController.getUserProfile)
  .delete(AdminOrUser, UserController.deleteProfile);

/* ---------------------------- ADMIN CREATE ------------------------------ */
router.post(
  "/create-admin",requireSuperAdmin,
  validateRequest(UserValidation.createAdminZodSchema),
  UserController.createAdmin,
);

 

/* ---------------------------- ADMINS LIST ------------------------------- */
router.get("/admins", requireSuperAdmin, UserController.getAdmin);
router.delete("/admins/:id", requireSuperAdmin, UserController.deleteAdmin);

 
 

/* ---------------------------- USER CREATE & UPDATE ---------------------- */
router
  .route("/")
  .post(UserController.createUser)
  .patch(
    requireAnyUser,
    fileUploadHandler(),
    parseAllFilesData({
      fieldName: FOLDER_NAMES.PROFILE_IMAGE,
      forceSingle: true,
    }),
    UserController.updateProfile,
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    UserController.getAllUsers,
  );

/* ---------------------------- DRIVER REGISTRATION ----------------------- */
router.get(
  "/driver/registration/me",
  requireDriver,
  UserController.getMyDriverRegistration,
);

router.patch(
  "/driver/registration/basic-info",
  requireDriver,
  fileUploadHandler(),
  parseAllFilesData({ fieldName: FOLDER_NAMES.PROFILE_IMAGE, forceSingle: true }),
  validateRequest(UserValidation.driverBasicInfoZodSchema),
  UserController.updateDriverBasicInfo,
);

router.patch(
  "/driver/registration/vehicle-info",
  requireDriver,
  fileUploadHandler(),
  parseAllFilesData({ fieldName: FOLDER_NAMES.VEHICLE_IMAGE, forceSingle: true }),
  validateRequest(UserValidation.driverVehicleInfoZodSchema),
  UserController.updateDriverVehicleInfo,
);

router.patch(
  "/driver/registration/required-docs",
  requireDriver,
  fileUploadHandler(),
  parseAllFilesData(
    { fieldName: FOLDER_NAMES.VEHICLE_REGISTRATION_DOC, forceSingle: true },
    { fieldName: FOLDER_NAMES.STATE_ID_DOC, forceSingle: true },
    { fieldName: FOLDER_NAMES.DRIVERS_LICENSE_DOC, forceSingle: true },
    { fieldName: FOLDER_NAMES.SSN_DOC, forceSingle: true },
    { fieldName: FOLDER_NAMES.INSURANCE_DOC, forceSingle: true },
  ),
  validateRequest(UserValidation.driverRequiredDocsZodSchema),
  UserController.updateDriverRequiredDocs,
);

router.patch(
  "/driver/registration/referral",
  requireDriver,
  validateRequest(UserValidation.driverReferralZodSchema),
  UserController.updateDriverReferral,
);

router.post(
  "/driver/registration/submit",
  requireDriver,
  UserController.submitDriverApplication,
);

// ---------------------------- USER STATUS ------------------------------- */
router.patch(
  "/:id/status",
  requireAdminOrSuperAdmin,
  UserController.updateStatusById,
);

 
 
/* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
router
  .route("/:id")
  .get(requireAdminOrSuperAdmin, UserController.getUserById)
  .delete(requireAdminOrSuperAdmin, UserController.deleteUserById);

export const UserRoutes = router;
