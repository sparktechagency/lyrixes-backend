import { model, Schema } from "mongoose";
import { USER_ROLES } from "../../../enums/user";
import {
  DRIVER_APPLICATION_STATUS,
  IUser,
  MEMBERSHIP_TYPE,
  SUBSCRIPTION_STATUS,
  UserModal,
  VEHICLE_TYPE,
} from "./user.interface";
import bcrypt from "bcrypt";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import config from "../../../config";

const DriverBasicInfoSchema = new Schema(
  {
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: null },
    ssn: { type: String, default: null },
  },
  { _id: false },
);

const DriverVehicleInfoSchema = new Schema(
  {
    vehicleType: {
      type: String,
      enum: Object.values(VEHICLE_TYPE),
      default: null,
    },
    make: { type: String, default: null },
    year: { type: Number, default: null },
    licensePlateNumber: { type: String, default: null },
    color: { type: String, default: null },
    vehicleImage: { type: [String], default: [] },
  },
  { _id: false },
);

const DriverRequiredDocsSchema = new Schema(
  {
    vehicleRegistrationDoc: { type: String, default: null },
    stateIdDoc: { type: String, default: null },
    driversLicenseDoc: { type: String, default: null },
    ssnDoc: { type: String, default: null },
    insuranceDoc: { type: String, default: null },
  },
  { _id: false },
);

const DriverStepsSchema = new Schema(
  {
    basicInfoCompleted: { type: Boolean, default: false },
    vehicleInfoCompleted: { type: Boolean, default: false },
    requiredDocsCompleted: { type: Boolean, default: false },
    referralCompleted: { type: Boolean, default: false },
  },
  { _id: false },
);

const DriverRegistrationSchema = new Schema(
  {
    basicInfo: { type: DriverBasicInfoSchema, default: {} },
    vehicleInfo: { type: DriverVehicleInfoSchema, default: {} },
    requiredDocs: { type: DriverRequiredDocsSchema, default: {} },
    referralCode: { type: String, default: null },
    steps: { type: DriverStepsSchema, default: {} },
    applicationStatus: {
      type: String,
      enum: Object.values(DRIVER_APPLICATION_STATUS),
      default: DRIVER_APPLICATION_STATUS.NONE,
    },
    submittedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema<IUser, UserModal>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
    },

    countryCode: {
      type: String,
    },

    email: {
      type: String,
      lowercase: true,
    },

    phone: {
      type: String,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },

    roles: {
      type: [String],
      enum: [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER],
      default: [],
    },

    activeMode: {
      type: String,
      enum: [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER],
      default: USER_ROLES.CUSTOMER,
    },

    profileImage: {
      type: String,
      required: false,
    },

    password: {
      type: String,
      required: false,
      select: 0,
      minlength: 8,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    connectedAccountId: {
      type: String,
      required: false,
      default: null,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    payoutsEnabled: {
      type: Boolean,
      default: false,
    },

    stripeCustomerId: {
      type: String,
      default: null,
    },

    stripeSubscriptionId: {
      type: String,
      default: null,
    },

    membershipType: {
      type: String,
      enum: Object.values(MEMBERSHIP_TYPE),
      default: MEMBERSHIP_TYPE.NONE,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    premiumExpiresAt: {
      type: Date,
      default: null,
    },

    subscriptionStatus: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.NONE,
    },

    currentPlanPrice: { type: Number, default: 0 },
    currency: { type: String, default: "usd" },

    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },

    driverRegistration: {
      type: DriverRegistrationSchema,
      default: {},
    },

    driverStatus: {
      type: {
        isOnline: { type: Boolean, default: false },
        isAvailable: { type: Boolean, default: false },
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
          },
          coordinates: {
            type: [Number],
            default: undefined,
          },
        },
        locationUpdatedAt: { type: Date, default: null },
      },
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $exists: true, $ne: null },
    },
  },
);

userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $exists: true, $ne: null },
    },
  },
);

userSchema.index(
  { "driverStatus.location": "2dsphere" },
  {
    partialFilterExpression: {
      roles: USER_ROLES.DRIVER,
      "driverStatus.location": { $exists: true },
      "driverStatus.location.coordinates": { $exists: true, $type: "array" },
    },
  },
);

userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id);
  return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

userSchema.statics.isAccountCreated = async (id: string) => {
  const isUserExist: any = await User.findById(id);
  return isUserExist.accountInformation.status;
};

userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

userSchema.pre("save", async function (next) {
  if (this.isModified("firstName") || this.isModified("lastName")) {
    this.fullName = `${this.firstName} ${this.lastName}`.trim();
  }

  if (this.isNew) {
    if (this.email) {
      const emailExist = await User.findOne({ email: this.email });
      if (emailExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Email already exist!");
      }
    }

    if (this.phone) {
      const phoneExist = await User.findOne({ phone: this.phone });
      if (phoneExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Phone already exist!");
      }
    }
  }

  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds),
    );
  }

  next();
});

export const User = model<IUser, UserModal>("User", userSchema);

// import { model, Schema } from "mongoose";
// import { USER_ROLES } from "../../../enums/user";
// import {
//   DRIVER_APPLICATION_STATUS,
//   IUser,
//   MEMBERSHIP_TYPE,
//   SUBSCRIPTION_STATUS,
//   UserModal,
//   VEHICLE_TYPE,
// } from "./user.interface";
// import bcrypt from "bcrypt";
// import ApiError from "../../../errors/ApiErrors";
// import { StatusCodes } from "http-status-codes";
// import config from "../../../config";

// // ====================Driver Code====================

// // const DriverAddressSchema = new Schema(
// //   {
// //     street: { type: String, default: null },
// //     city: { type: String, default: null },
// //     state: { type: String, default: null },
// //     zip: { type: String, default: null },
// //     country: { type: String, default: null },
// //   },
// //   { _id: false },
// // );

// const DriverBasicInfoSchema = new Schema(
//   {
//     dateOfBirth: { type: Date, default: null },
//     address: { type: String, default: null },
//     ssn: { type: String, default: null },
//   },
//   { _id: false },
// );

// const DriverVehicleInfoSchema = new Schema(
//   {
//     vehicleType: {
//       type: String,
//       enum: Object.values(VEHICLE_TYPE),
//       default: null,
//     },
//     make: { type: String, default: null },
//     year: { type: Number, default: null },
//     licensePlateNumber: { type: String, default: null },
//     color: { type: String, default: null },
//     vehicleImage: { type: [String], default: [] },
//   },
//   { _id: false },
// );

// const DriverRequiredDocsSchema = new Schema(
//   {
//     vehicleRegistrationDoc: { type: String, default: null },
//     stateIdDoc: { type: String, default: null },
//     driversLicenseDoc: { type: String, default: null },
//     ssnDoc: { type: String, default: null },
//     insuranceDoc: { type: String, default: null },
//   },
//   { _id: false },
// );

// const DriverStepsSchema = new Schema(
//   {
//     basicInfoCompleted: { type: Boolean, default: false },
//     vehicleInfoCompleted: { type: Boolean, default: false },
//     requiredDocsCompleted: { type: Boolean, default: false },
//     referralCompleted: { type: Boolean, default: false },
//   },
//   { _id: false },
// );

// const DriverRegistrationSchema = new Schema(
//   {
//     basicInfo: { type: DriverBasicInfoSchema, default: {} },
//     vehicleInfo: { type: DriverVehicleInfoSchema, default: {} },
//     requiredDocs: { type: DriverRequiredDocsSchema, default: {} },
//     referralCode: { type: String, default: null },
//     steps: { type: DriverStepsSchema, default: {} },
//     applicationStatus: {
//       type: String,
//       enum: Object.values(DRIVER_APPLICATION_STATUS),
//       default: DRIVER_APPLICATION_STATUS.NONE,
//     },
//     submittedAt: { type: Date, default: null },
//   },
//   { _id: false },
// );
// // ===================Driver Code End====================
// const userSchema = new Schema<IUser, UserModal>(
//   {
//     firstName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     lastName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     fullName: {
//       type: String,
//       // required: true,
//     },

//     // email: {
//     //   type: String,
//     //   required: false,
//     //   unique: true,
//     //   lowercase: true,
//     //   sparse: true,
//     // },
//     countryCode: {
//       type: String,
//       // required: true,
//     },
//     // phone: {
//     //   type: String,
//     //   // required: true,
//     //   unique: true,
//     //   sparse: true,
//     // },
//     email: {
//       type: String,
//       lowercase: true,
//     },

//     phone: {
//       type: String,
//     },

//     role: {
//       type: String,
//       enum: Object.values(USER_ROLES),
//       required: true,
//     },

//     profileImage: {
//       type: String,
//       required: false,
//     },

//     password: {
//       type: String,
//       required: false,
//       select: 0,
//       minlength: 8,
//     },

//     verified: {
//       type: Boolean,
//       default: false,
//     },
//     // agreedToTerms: {
//     //   type: Boolean,
//     //   required: true,
//     // },

//     // stripe ....
//     connectedAccountId: {
//       type: String,
//       required: false,
//       default: null,
//     },
//     onboardingCompleted: {
//       type: Boolean,
//       default: false,
//     },
//     payoutsEnabled: {
//       type: Boolean,
//       default: false,
//     },
//     // .... stripe

//     // Stripe & Membership Logic +  // Subscription
//     stripeCustomerId: {
//       type: String,
//       default: null,
//     },

//     stripeSubscriptionId: {
//       type: String,
//       default: null,
//     },

//     membershipType: {
//       type: String,
//       enum: Object.values(MEMBERSHIP_TYPE),
//       default: MEMBERSHIP_TYPE.NONE,
//     },

//     isPremium: {
//       type: Boolean,
//       default: false,
//     },

//     premiumExpiresAt: {
//       type: Date,
//       default: null,
//     },

//     subscriptionStatus: {
//       type: String,
//       enum: Object.values(SUBSCRIPTION_STATUS),
//       default: SUBSCRIPTION_STATUS.NONE,
//     },

//     currentPlanPrice: { type: Number, default: 0 },
//     currency: { type: String, default: "usd" },
//     // .... Subscription
//     authentication: {
//       type: {
//         isResetPassword: {
//           type: Boolean,
//           default: false,
//         },
//         oneTimeCode: {
//           type: Number,
//           default: null,
//         },
//         expireAt: {
//           type: Date,
//           default: null,
//         },
//       },
//       select: 0,
//     },

//     // ====================Driver Code====================
//     driverRegistration: {
//       type: DriverRegistrationSchema,
//       default: {},
//     },
//     driverStatus: {
//       type: {
//         isOnline: { type: Boolean, default: false },
//         isAvailable: { type: Boolean, default: false },
//         location: {
//           type: {
//             type: String,
//             enum: ["Point"],
//             default: "Point",
//           },
//           coordinates: {
//             type: [Number], // [lng, lat]
//             default: undefined,
//           },
//         },
//         locationUpdatedAt: { type: Date, default: null },
//       },
//       default: {},
//     },
//     // ==================Driver Code End====================
//   },
//   {
//     timestamps: true,
//     versionKey: false,
//     toJSON: {
//       virtuals: true,
//       transform: (_doc, ret) => {
//         delete ret.id;
//         return ret;
//       },
//     },
//     toObject: {
//       virtuals: true,
//       transform: (_doc, ret) => {
//         delete ret.id;
//         return ret;
//       },
//     },
//   },
// );

// // indexing

// userSchema.index(
//   { email: 1 },
//   {
//     unique: true,
//     partialFilterExpression: {
//       email: { $exists: true, $ne: null },
//     },
//   },
// );

// userSchema.index(
//   { phone: 1 },
//   {
//     unique: true,
//     partialFilterExpression: {
//       phone: { $exists: true, $ne: null },
//     },
//   },
// );
// // userSchema.index({ "driverStatus.location": "2dsphere" });
// // ✅ GEO index only for drivers who actually have a location
// userSchema.index(
//   { "driverStatus.location": "2dsphere" },
//   {
//     partialFilterExpression: {
//       role: USER_ROLES.DRIVER,
//       "driverStatus.location": { $exists: true },
//       "driverStatus.location.coordinates": { $exists: true, $type: "array" },
//     },
//   },
// );


// //exist user check
// userSchema.statics.isExistUserById = async (id: string) => {
//   const isExist = await User.findById(id);
//   return isExist;
// };

// userSchema.statics.isExistUserByEmail = async (email: string) => {
//   const isExist = await User.findOne({ email });
//   return isExist;
// };

// //account check
// userSchema.statics.isAccountCreated = async (id: string) => {
//   const isUserExist: any = await User.findById(id);
//   return isUserExist.accountInformation.status;
// };

// //is match password
// userSchema.statics.isMatchPassword = async (
//   password: string,
//   hashPassword: string,
// ): Promise<boolean> => {
//   return await bcrypt.compare(password, hashPassword);
// };

// //check user
// userSchema.pre("save", async function (next) {
//   if (this.isModified("firstName") || this.isModified("lastName")) {
//     this.fullName = `${this.firstName} ${this.lastName}`.trim();
//   }

//   if (this.isNew) {
//     // Email duplicate check
//     if (this.email) {
//       const emailExist = await User.findOne({ email: this.email });
//       if (emailExist) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Email already exist!");
//       }
//     }

//     // Phone duplicate check
//     if (this.phone) {
//       const phoneExist = await User.findOne({ phone: this.phone });
//       if (phoneExist) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Phone already exist!");
//       }
//     }
//   }

//   if (this.isModified("password") && this.password) {
//     this.password = await bcrypt.hash(
//       this.password,
//       Number(config.bcrypt_salt_rounds),
//     );
//   }

//   next();
// });

// export const User = model<IUser, UserModal>("User", userSchema);