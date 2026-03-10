import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";

interface ExtendedSocket extends Socket {
  userId?: string;
}

let ioInstance: Server;

// userId → socketId mapping
const userSocketMap = new Map<string, string>();

const socket = (io: Server) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      userSocketMap.set(userId, socket.id); // ✅ Map-এ store করো
      logger.info(colors.green(`User ${userId} registered with socket ${socket.id}`));
    }

    logger.info(colors.blue("A User connected"));

    socket.on("disconnect", () => {
      if (userId) {
        userSocketMap.delete(userId); // ✅ disconnect-এ remove করো
      }
      logger.info(colors.red("A user disconnected"));
    });
  });
};

export const socketHelper = { socket };

export function emitToUser(userId: string, event: string, payload: any) {
  if (!ioInstance) {
    logger.warn("Socket.IO not initialized");
    return;
  }

  const socketId = userSocketMap.get(userId); // ✅ Map থেকে socketId নাও

  if (!socketId) {
    logger.warn(`User ${userId} is not connected`);
    return;
  }

  ioInstance.to(socketId).emit(event, payload); // ✅ সরাসরি emit করো
}