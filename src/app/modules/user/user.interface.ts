import { Model } from "mongoose";
import { USER_ROLES } from "../../../enums/user";

export enum MEMBERSHIP_TYPE {
  NONE = "none",
  PREMIUM = "premium",
}

export enum SUBSCRIPTION_STATUS {
  ACTIVE = "active",
  DEACTIVATED = "deactivated",
  NONE = "none",
}

export enum VEHICLE_TYPE {
  BICYCLE = "BICYCLE",
  E_BIKE = "E_BIKE",
  E_SCOOTER = "E_SCOOTER",
  MOTORCYCLE = "MOTORCYCLE",
  CAR = "CAR",
  TRUCK = "TRUCK",
  OTHER = "OTHER",
}

export enum DRIVER_APPLICATION_STATUS {
  NONE = "NONE",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export type IDriverStatus = {
  isOnline?: boolean;
  isAvailable?: boolean;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  locationUpdatedAt?: Date | null;
};

export type IDriverRegistration = {
  basicInfo?: {
    dateOfBirth?: Date;
    address?: string;
    ssn?: string;
  };
  vehicleInfo?: {
    vehicleType?: VEHICLE_TYPE;
    make?: string;
    year?: number;
    licensePlateNumber?: string;
    color?: string;
    vehicleImage?: string[] | string;
  };
  requiredDocs?: {
    vehicleRegistrationDoc?: string;
    stateIdDoc?: string;
    driversLicenseDoc?: string;
    ssnDoc?: string;
    insuranceDoc?: string;
  };
  referralCode?: string | null;
  steps?: {
    basicInfoCompleted?: boolean;
    vehicleInfoCompleted?: boolean;
    requiredDocsCompleted?: boolean;
    referralCompleted?: boolean;
  };
  applicationStatus?: DRIVER_APPLICATION_STATUS;
  submittedAt?: Date | null;
};

export type IUser = {
  firstName: string;
  lastName: string;
  fullName?: string;

  role: USER_ROLES; // compatibility field
  roles?: USER_ROLES[];
  activeMode?: USER_ROLES;

  countryCode: string;
  email: string;
  phone?: string;
  profileImage?: string;
  password: string;
  verified: boolean;

  connectedAccountId?: string;
  onboardingCompleted?: boolean;
  payoutsEnabled?: boolean;

  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;

  membershipType?: MEMBERSHIP_TYPE;
  isPremium?: boolean;
  premiumExpiresAt?: Date | null;

  subscriptionStatus?: SUBSCRIPTION_STATUS;
  currentPlanPrice: number;
  currency: string;

  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };

  driverRegistration?: IDriverRegistration;
  driverStatus?: IDriverStatus;

  createdAt?: Date;
  updatedAt?: Date;
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isAccountCreated(id: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;

// import { Model } from "mongoose";
// import { USER_ROLES } from "../../../enums/user";

// export enum MEMBERSHIP_TYPE {
//   NONE = "none",
//   PREMIUM = "premium",
// }

// export enum SUBSCRIPTION_STATUS {
//   ACTIVE = "active",
//   DEACTIVATED = "deactivated",
//   NONE = "none",
// }

// // ---------------- Driver registration ----------------
// export enum VEHICLE_TYPE {
//   BICYCLE = "BICYCLE",
//   E_BIKE = "E_BIKE",
//   E_SCOOTER = "E_SCOOTER",
//   MOTORCYCLE = "MOTORCYCLE",
//   CAR = "CAR",
//   TRUCK = "TRUCK",
//   OTHER = "OTHER",
// }

// export enum DRIVER_APPLICATION_STATUS {
//   NONE = "NONE",
//   SUBMITTED = "SUBMITTED",
//   APPROVED = "APPROVED",
//   REJECTED = "REJECTED",
// }

// // export type IDriverAddress = {
// //   street?: string;
// //   city?: string;
// //   state?: string;
// //   zip?: string;
// //   country?: string;
// // };

// // ------------------------------------------------
// export type IDriverStatus = {
//   isOnline?: boolean;
//   isAvailable?: boolean;
//   location?: {
//     type: "Point";
//     coordinates: [number, number]; // [lng, lat]
//   };
//   locationUpdatedAt?: Date | null;
// };

 

// export type IDriverRegistration = {
//   basicInfo?: {
//     dateOfBirth?: Date;
//     address?: string;
//     ssn?: string;
//   };
//   vehicleInfo?: {
//     vehicleType?: VEHICLE_TYPE;
//     make?: string;
//     year?: number;
//     licensePlateNumber?: string;
//     color?: string;
//     vehicleImage?: string[];
//   };
//   requiredDocs?: {
//     vehicleRegistrationDoc?: string;
//     stateIdDoc?: string;
//     driversLicenseDoc?: string;
//     ssnDoc?: string;
//     insuranceDoc?: string;
//   };
//   referralCode?: string | null;
//   steps?: {
//     basicInfoCompleted?: boolean;
//     vehicleInfoCompleted?: boolean;
//     requiredDocsCompleted?: boolean;
//     referralCompleted?: boolean;
//   };
//   applicationStatus?: DRIVER_APPLICATION_STATUS;
//   submittedAt?: Date | null;
// };

// export type IUser = {
//   firstName: string;
//   lastName: string;
//   fullName?: string;
//   role: USER_ROLES;
//   countryCode: string;
//   email: string;
//   phone?: string;
//   profileImage?: string;
//   password: string;
//   verified: boolean;
//   // agreedToTerms?: boolean;
//   // stripe ....
//   connectedAccountId?: string;
//   onboardingCompleted?: boolean;
//   payoutsEnabled?: boolean;
//   // .... stripe

//   // subscription
//   stripeCustomerId?: string;
//   stripeSubscriptionId?: string | null;

//   membershipType?: MEMBERSHIP_TYPE;
//   isPremium?: boolean;
//   premiumExpiresAt?: Date | null;

//   subscriptionStatus?: SUBSCRIPTION_STATUS;
//   currentPlanPrice: number;
//   currency: string;
//   // .... subscription
//   authentication?: {
//     isResetPassword: boolean;
//     oneTimeCode: number;
//     expireAt: Date;
//   };

//   // driver registration (only for role DRIVER)
//   driverRegistration?: IDriverRegistration;
//   // driver status (only for role DRIVER)
//     driverStatus?: IDriverStatus;
// };

// export type UserModal = {
//   isExistUserById(id: string): any;
//   isExistUserByEmail(email: string): any;
//   isAccountCreated(id: string): any;
//   isMatchPassword(password: string, hashPassword: string): boolean;
// } & Model<IUser>;