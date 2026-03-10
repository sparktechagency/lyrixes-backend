 import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";

interface ExtendedSocket extends Socket {
  userId?: string;
}

let ioInstance: Server;

const USER_ROOM_PREFIX = "user:";
const DELIVERY_ROOM_PREFIX = "delivery:";

const getUserRoom = (userId: string) => `${USER_ROOM_PREFIX}${userId}`;
const getDeliveryRoom = (deliveryId: string) =>
  `${DELIVERY_ROOM_PREFIX}${deliveryId}`;

const socket = (io: Server) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    logger.info(colors.blue("A User connected"));

    socket.on("register", (userId: string) => {
      if (!userId) return;

      const extendedSocket = socket as ExtendedSocket;
      extendedSocket.userId = userId;
      socket.join(getUserRoom(userId));
      socket.emit("socket:registered", { userId });

      logger.info(colors.green(`User ${userId} registered`));
    });

    socket.on("delivery:join", (deliveryId: string) => {
      if (!deliveryId) return;
      socket.join(getDeliveryRoom(deliveryId));
    });

    socket.on("delivery:leave", (deliveryId: string) => {
      if (!deliveryId) return;
      socket.leave(getDeliveryRoom(deliveryId));
    });

    socket.on("disconnect", () => {
      logger.info(colors.red("A user disconnect"));
    });
  });
};

export const socketHelper = { socket };

export function getIoInstance() {
  return ioInstance;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!ioInstance) {
    logger.warn("Socket.IO not initialized");
    return;
  }

  ioInstance.to(getUserRoom(userId)).emit(event, payload);
}

export function emitToDelivery(
  deliveryId: string,
  event: string,
  payload: unknown,
) {
  if (!ioInstance) {
    logger.warn("Socket.IO not initialized");
    return;
  }

  ioInstance.to(getDeliveryRoom(deliveryId)).emit(event, payload);
}
// import colors from "colors";
// import { Server, Socket } from "socket.io";
// import { logger } from "../shared/logger";

// interface ExtendedSocket extends Socket {
//   userId?: string;
// }

// let ioInstance: Server;

// const socket = (io: Server) => {
//   ioInstance = io;
//   io.on("connection", (socket) => {
//     logger.info(colors.blue("A User connected"));

//     socket.on("register", (userId: string) => {
//       if (userId) {
//         (socket as ExtendedSocket).userId = userId;
//         logger.info(colors.green(`User ${userId} registered`));
//       }
//     });

//     // disconnect
//     socket.on("disconnect", () => {
//       logger.info(colors.red("A user disconnect"));
//     });
//   });
// };

// export const socketHelper = { socket };

// export function emitToUser(userId: string, event: string, payload: any) {
//   if (!ioInstance) {
//     logger.warn("Socket.IO not initialized");
//     return;
//   }

//   for (const client of ioInstance.sockets.sockets.values()) {
//     const s = client as ExtendedSocket;
//     if (s.userId === userId) {
//       s.emit(event, payload);
//     }
//   }
// }

