// import { INotification } from "../app/modules/notification/notification.interface";
// import { Notification } from "../app/modules/notification/notification.model";

// export const sendNotifications = async (data: any): Promise<INotification> => {
//   const result = await Notification.create(data);

//   //@ts-ignore
//   const socketIo = global.io;

//   if (socketIo) {
//     socketIo.emit(`get-notification::${data?.receiver}`, result);
//   }

//   return result;
// };
import { INotification } from "../app/modules/notification/notification.interface";
import { Notification } from "../app/modules/notification/notification.model";
import { emitToUser } from "./socketHelper";

export const sendNotifications = async (data: any): Promise<INotification> => {
  const result = await Notification.create(data);

  if (data?.receiver) {
    emitToUser(String(data.receiver), "notification:new", result);
  }

  return result;
};