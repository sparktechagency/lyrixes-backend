import { z } from "zod";

const sendMessage = z.object({
  body: z.object({
    deliveryId: z.string().min(1),
    receiverId: z.string().min(1),
    text: z.string().trim().min(1).max(2000),
    attachments: z
      .array(
        z.object({
          url: z.string().min(1),
          type: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

const getMessages = z.object({
  params: z.object({
    deliveryId: z.string().min(1),
  }),
});

const markAsRead = z.object({
  params: z.object({
    deliveryId: z.string().min(1),
  }),
});

export const MessageValidation = {
  sendMessage,
  getMessages,
  markAsRead,
};