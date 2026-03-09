// Payment module for Parcel Delivery (inDrive-like)

export interface InitiateDeliveryPaymentDto {
  deliveryId: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}
