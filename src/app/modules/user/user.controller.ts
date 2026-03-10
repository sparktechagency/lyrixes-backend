// import bcrypt from "bcrypt";
// import { NextFunction, Request, Response } from "express";
// import { StatusCodes } from "http-status-codes";
// import { UserService } from "./user.service";
// import catchAsync from "../../../shared/catchAsync";
// import sendResponse from "../../../shared/sendResponse";
// import { JwtPayload } from "jsonwebtoken";
// import config from "../../../config";

// // register user
// const createUser = catchAsync(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { ...userData } = req.body;

//     console.log(userData, "payload");

//     const result = await UserService.createUserToDB(userData);

//     sendResponse(res, {
//       success: true,
//       statusCode: StatusCodes.OK,
//       message:
//         "Your account has been successfully created. Verify Your Email By OTP. Check your email",
//       data: result,
//     });
//   }
// );

// // register admin
// const createAdmin = catchAsync(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { ...userData } = req.body;
//     const result = await UserService.createAdminToDB(userData);

//     sendResponse(res, {
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: "Admin created successfully",
//       data: result,
//     });
//   }
// );

// const getAdmin = catchAsync(async (req: Request, res: Response) => {
//   const result = await UserService.getAdminFromDB(req.query);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Admin retrieved Successfully",
//     data: result,
//   });
// });

// const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
//   const payload = req.params.id;
//   const result = await UserService.deleteAdminFromDB(payload);

//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Admin Deleted Successfully",
//     data: result,
//   });
// });

// // retrieved user profile
// const getUserProfile = catchAsync(async (req: Request, res: Response) => {
//   const user = req.user;
//   const result = await UserService.getUserProfileFromDB(user as JwtPayload);

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: "Profile data retrieved successfully",
//     data: result,
//   });
// });

// //update profile
// const updateProfile = catchAsync(async (req, res) => {
//   const user: any = req.user;
//   // if ("role" in req.body) {
//   //   delete req.body.role;
//   // }
//   // If password is provided
//   if (req.body.password) {
//     req.body.password = await bcrypt.hash(
//       req.body.password,
//       Number(config.bcrypt_salt_rounds)
//     );
//   }

//   const result = await UserService.updateProfileToDB(user, req.body);

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: "Profile updated successfully",
//     data: result,
//   });
// });

// const getAllUsers = catchAsync(async (req, res) => {
//   const result = await UserService.getAllUsersFromDB(req.query);

//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "Successfully retrieved are users data",
//     data: result,
//   });
// });

// const getUserById = catchAsync(async (req, res) => {
//   const { id } = req.params;
//   const result = await UserService.getUserByIdFromDB(id);

//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "Successfully retrieve user by ID",
//     data: result,
//   });
// });

// const deleteUserById = catchAsync(async (req, res) => {
//   const { id } = req.params;

//   const result = await UserService.deleteUserByIdFromD(id);

//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "User is deleted successfully",
//     data: result,
//   });
// });

// const deleteProfile = catchAsync(async (req, res) => {
//   const { id: userId } = req.user;

//   const result = await UserService.deleteProfileFromDB(userId);

//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "Successfully delete your account",
//     data: result,
//   });
// });

// export const UserController = {
//   createUser,
//   createAdmin,
//   getAdmin,
//   deleteAdmin,
//   getUserProfile,
//   updateProfile,
//   getAllUsers,
//   getUserById,
//   deleteUserById,
//   deleteProfile,
// };

import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UserService } from "./user.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { JwtPayload } from "jsonwebtoken";
import config from "../../../config";

// register user
const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;

    console.log(userData, "payload");

    const result = await UserService.createUserToDB(userData);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        "Your account has been successfully created. Verify Your Email By OTP. Check your email",
      data: result,
    });
  }
);

// register admin
const createAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createAdminToDB(userData);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Admin created successfully",
      data: result,
    });
  }
);

const getAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAdminFromDB(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin retrieved Successfully",
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.params.id;
  const result = await UserService.deleteAdminFromDB(payload);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin Deleted Successfully",
    data: result,
  });
});

// retrieved user profile
const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.getUserProfileFromDB(user as JwtPayload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Profile data retrieved successfully",
    data: result,
  });
});

//update profile
const updateProfile = catchAsync(async (req, res) => {
  const user: any = req.user;
  // if ("role" in req.body) {
  //   delete req.body.role;
  // }
  // If password is provided
  if (req.body.password) {
    req.body.password = await bcrypt.hash(
      req.body.password,
      Number(config.bcrypt_salt_rounds)
    );
  }

  const result = await UserService.updateProfileToDB(user, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Profile updated successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserService.getAllUsersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved are users data",
    data: result,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserService.getUserByIdFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieve user by ID",
    data: result,
  });
});

const deleteUserById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await UserService.deleteUserByIdFromD(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User is deleted successfully",
    data: result,
  });
});

const deleteProfile = catchAsync(async (req, res) => {
  const { id: userId } = req.user;

  const result = await UserService.deleteProfileFromDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully delete your account",
    data: result,
  });
});

// ============================ Driver Registration ============================

const getMyDriverRegistration = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMyDriverRegistrationFromDB(req.user as JwtPayload);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver registration retrieved successfully",
    data: result,
  });
});

const updateDriverBasicInfo = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateDriverBasicInfoToDB(req.user as JwtPayload, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver basic info updated successfully",
    data: result,
  });
});

const updateDriverVehicleInfo = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateDriverVehicleInfoToDB(req.user as JwtPayload, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver vehicle info updated successfully",
    data: result,
  });
});

const updateDriverRequiredDocs = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateDriverRequiredDocsToDB(req.user as JwtPayload, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver required documents updated successfully",
    data: result,
  });
});

const updateDriverReferral = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateDriverReferralToDB(req.user as JwtPayload, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver referral updated successfully",
    data: result,
  });
});

const submitDriverApplication = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.submitDriverApplicationToDB(req.user as JwtPayload);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Application sent",
    data: result,
  });
});

const updateStatusById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { status } = req.body;

  const result = await UserService.updateStatusByIdToDB(id, status);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Status updated successfully",
    data: result,
  });
});

export const UserController = {
  createUser,
  createAdmin,
  getAdmin,
  deleteAdmin,
  getUserProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  deleteUserById,
  deleteProfile,
  updateStatusById,
  // driver registration
  getMyDriverRegistration,
  updateDriverBasicInfo,
  updateDriverVehicleInfo,
  updateDriverRequiredDocs,
  updateDriverReferral,
  submitDriverApplication,
};

