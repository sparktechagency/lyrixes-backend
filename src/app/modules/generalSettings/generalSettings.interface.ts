export interface IGeneralSettings {
  companyName: string;
  supportEmail: string;
  supportPhone?: string;
  timeZone?: string;
  companyAddress?: string;
  operatingHours?: {
    start?: string;
    end?: string;
  }
}