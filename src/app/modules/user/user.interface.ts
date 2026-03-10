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
// };

// export type UserModal = {
//   isExistUserById(id: string): any;
//   isExistUserByEmail(email: string): any;
//   isAccountCreated(id: string): any;
//   isMatchPassword(password: string, hashPassword: string): boolean;
// } & Model<IUser>;


import { Model } from "mongoose";
import { STATUS, USER_ROLES } from "../../../enums/user";

export enum MEMBERSHIP_TYPE {
  NONE = "none",
  PREMIUM = "premium",
}

export enum SUBSCRIPTION_STATUS {
  ACTIVE = "active",
  DEACTIVATED = "deactivated",
  NONE = "none",
}

// ---------------- Driver registration ----------------
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

export type IDriverAddress = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export type IDriverRegistration = {
  basicInfo?: {
    dateOfBirth?: Date;
    address?: IDriverAddress;
    ssn?: string;
  };
  vehicleInfo?: {
    vehicleType?: VEHICLE_TYPE;
    make?: string;
    year?: number;
    licensePlateNumber?: string;
    color?: string;
    vehicleImage?: string[];
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
  role: USER_ROLES;
  countryCode: string;
  email: string;
  phone?: string;
  profileImage?: string;
  password: string;
  verified: boolean;
  status?: STATUS;
 
  // agreedToTerms?: boolean;
  // stripe ....
  connectedAccountId?: string;
  onboardingCompleted?: boolean;
  payoutsEnabled?: boolean;
  // .... stripe

  // subscription
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;

  membershipType?: MEMBERSHIP_TYPE;
  isPremium?: boolean;
  premiumExpiresAt?: Date | null;

  subscriptionStatus?: SUBSCRIPTION_STATUS;
  currentPlanPrice: number;
  currency: string;
  // .... subscription
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };

  // driver registration (only for role DRIVER)
  driverRegistration?: IDriverRegistration;
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isAccountCreated(id: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
