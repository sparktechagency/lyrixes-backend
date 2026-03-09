import { z } from "zod";

export const PaymentValidation = {
  initiateDeliveryPayment: z.object({
    body: z.object({
      deliveryId: z.string().min(1),
    }),
  }),

  adminPayout: z.object({
    body: z.object({
      deliveryId: z.string().min(1),
    }),
  }),
};
