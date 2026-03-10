import { GeneralSettings } from "./generalSettings.model";

interface IUpdateSettingsPayload {
    companyName: string;
    supportEmail: string;
    supportPhone?: string;
    timeZone?: string;
    companyAddress?: string;
    operatingHoursStart?: string;
    operatingHoursEnd?: string;
}

const createSettingsInDB = async (
    createData: IUpdateSettingsPayload
) => {
    const existing = await GeneralSettings.findOne();
    if (existing) {
        throw new Error("Settings already exist. Use update instead.");
    }

    const {
        companyName,
        supportEmail,
        supportPhone,
        timeZone,
        companyAddress,
        operatingHoursStart,
        operatingHoursEnd,
    } = createData;

    const payload = {
        companyName,
        supportEmail,
        supportPhone,
        timeZone,
        companyAddress,
        operatingHours: {
            start: operatingHoursStart ?? "",
            end: operatingHoursEnd ?? "",
        },
    };

    const created = await GeneralSettings.create(payload);
    return created;
};

const getSettingsFromDB = async () => {
    let settings = await GeneralSettings.findOne();
    if (!settings) {
        settings = await GeneralSettings.create({
            companyName: "Courier Express",
            supportEmail: "support@courierexpress.com",
        });
    }
    return settings;
};



const updateSettingsInDB = async (updateData: IUpdateSettingsPayload) => {
    const {
        companyName,
        supportEmail,
        supportPhone,
        timeZone,
        companyAddress,
        operatingHoursStart,
        operatingHoursEnd,
    } = updateData;

    const payload: Record<string, unknown> = {};

    if (companyName !== undefined) payload.companyName = companyName;
    if (supportEmail !== undefined) payload.supportEmail = supportEmail;
    if (supportPhone !== undefined) payload.supportPhone = supportPhone;
    if (timeZone !== undefined) payload.timeZone = timeZone;
    if (companyAddress !== undefined) payload.companyAddress = companyAddress;
    if (operatingHoursStart !== undefined) payload["operatingHours.start"] = operatingHoursStart;
    if (operatingHoursEnd !== undefined) payload["operatingHours.end"] = operatingHoursEnd;

    const updated = await GeneralSettings.findOneAndUpdate(
        {},
        { $set: payload },
        { new: true, upsert: true, runValidators: true }
    );
    return updated!;
};

export const GeneralSettingsServices = {
    getSettingsFromDB,
    createSettingsInDB,
    updateSettingsInDB,
};