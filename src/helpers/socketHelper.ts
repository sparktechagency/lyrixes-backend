import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";

interface ExtendedSocket extends Socket {
  userId?: string;
}

let ioInstance: Server;

const socket = (io: Server) => {
  ioInstance = io;
  io.on("connection", (socket) => {
    logger.info(colors.blue("A User connected"));

    socket.on("register", (userId: string) => {
      if (userId) {
        (socket as ExtendedSocket).userId = userId;
        logger.info(colors.green(`User ${userId} registered`));
      }
    });

    // disconnect
    socket.on("disconnect", () => {
      logger.info(colors.red("A user disconnect"));
    });
  });
};

export const socketHelper = { socket };

export function emitToUser(userId: string, event: string, payload: any) {
  if (!ioInstance) {
    logger.warn("Socket.IO not initialized");
    return;
  }

  for (const client of ioInstance.sockets.sockets.values()) {
    const s = client as ExtendedSocket;
    if (s.userId === userId) {
      s.emit(event, payload);
    }
  }
}

