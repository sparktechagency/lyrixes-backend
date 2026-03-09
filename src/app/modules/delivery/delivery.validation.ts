// import { z } from "zod";

// const pointSchema = z.object({
//   lat: z.number(),
//   lng: z.number(),
//   address: z.string().optional(),
// });

// export const DeliveryValidation = {
//   createDelivery: z.object({
//     body: z.object({
//       vehicleType: z.string(),
//       pickup: pointSchema,
//       dropoff: pointSchema,
//       receiver: z.object({
//         name: z.string(),
//         phone: z.string(),
//         note: z.string().optional(),
//       }),
//       parcel: z
//         .object({
//           type: z.string().optional(),
//           size: z.string().optional(),
//           weightKg: z.number().optional(),
//           description: z.string().optional(),
//           isFragile: z.boolean().optional(),
//           isLiquid: z.boolean().optional(),
//           isValuable: z.boolean().optional(),
//           photos: z.array(z.string()).optional(),
//         })
//         .optional(),
//       customerOfferFare: z.number().min(1),
//     }),
//   }),

//   matches: z.object({
//     query: z.object({
//       radiusKm: z.string().optional(), // default 5
//       limit: z.string().optional(), // default 20
//     }),
//   }),

//   requestDriver: z.object({
//     body: z.object({
//       driverId: z.string(),
//     }),
//   }),

//   driverAccept: z.object({
//     body: z.object({
//       deliveryId: z.string(),
//     }),
//   }),

//   driverBid: z.object({
//     body: z.object({
//       deliveryId: z.string(),
//       offeredFare: z.number().min(1),
//       note: z.string().optional(),
//     }),
//   }),

//   customerAcceptOffer: z.object({
//     body: z.object({
//       offerId: z.string(),
//     }),
//   }),

//   bookNow: z.object({
//     body: z.object({
//       deliveryId: z.string(),
//     }),
//   }),
// };


import { z } from "zod";

const pointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

export const DeliveryValidation = {
  createDelivery: z.object({
    body: z.object({
      vehicleType: z.string(),
      pickup: pointSchema,
      dropoff: pointSchema,
      receiver: z.object({
        name: z.string(),
        phone: z.string(),
        note: z.string().optional(),
      }),
      parcel: z
        .object({
          type: z.string().optional(),
          size: z.string().optional(),
          weightKg: z.number().optional(),
          description: z.string().optional(),
          isFragile: z.boolean().optional(),
          isLiquid: z.boolean().optional(),
          isValuable: z.boolean().optional(),
          photos: z.array(z.string()).optional(),
        })
        .optional(),
      customerOfferFare: z.number().min(1),
    }),
  }),

  matches: z.object({
    query: z.object({
      radiusKm: z.string().optional(),
      limit: z.string().optional(),
    }),
  }),


  // cencel + update 

  cancelDelivery: z.object({
  params: z.object({
    id: z.string(),
  }),
}),

changeDeliveryInfo: z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    vehicleType: z.string().optional(),

    pickup: z
      .object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        address: z.string().optional(),
      })
      .optional(),

    dropoff: z
      .object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        address: z.string().optional(),
      })
      .optional(),

    receiver: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        note: z.string().optional(),
      })
      .optional(),

    parcel: z
      .object({
        type: z.string().optional(),
        size: z.string().optional(),
        weightKg: z.number().optional(),
        description: z.string().optional(),
        isFragile: z.boolean().optional(),
        isLiquid: z.boolean().optional(),
        isValuable: z.boolean().optional(),
        photos: z.array(z.string()).optional(),
      })
      .optional(),

    customerOfferFare: z.number().min(1).optional(),
  }),
}),

  // ✅ NEW: driver accept an OPEN delivery
  driverAcceptOpen: z.object({
    params: z.object({
      id: z.string(),
    }),
  }),

  // ✅ NEW: customer finding couriers (accept list + bids)
  findingCouriers: z.object({
    params: z.object({
      id: z.string(),
    }),
  }),

  // ✅ NEW: customer select driver
  selectDriver: z.object({
    params: z.object({
      id: z.string(),
    }),
    body: z.object({
      driverId: z.string(),
    }),
  }),

  // ✅ NEW: customer reply bid
  replyBid: z.object({
    params: z.object({
      id: z.string(),
    }),
    body: z.object({
      driverId: z.string(),
      customerCounterFare: z.number().min(1),
    }),
  }),

  driverBid: z.object({
    body: z.object({
      deliveryId: z.string(),
      offeredFare: z.number().min(1),
      note: z.string().optional(),
    }),
  }),

  bookNow: z.object({
    body: z.object({
      deliveryId: z.string(),
    }),
  }),

    rateDelivery: z.object({
    params: z.object({
      id: z.string(),
    }),
    body: z.object({
      stars: z.number().min(1).max(5),
      note: z.string().max(500).optional(),
    }),
  }),

};