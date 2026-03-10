import mongoose, { model } from "mongoose";

const generalSettingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxLength: [100, "Company name cannot exceed 100 characters"],
    },
    supportEmail: {
      type: String,
      required: [true, "Support email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    supportPhone: {
      type: String,
      trim: true,
      default: "",
    },
    timeZone: {
      type: String,
      trim: true,
      default: "UTC",
    },
    companyAddress: {
      type: String,
      trim: true,
      default: "",
    },
    operatingHours: {
      start: {
        type: String,
        default: "",
      },
      end: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const GeneralSettings=model("GeneralSettings",generalSettingsSchema)
