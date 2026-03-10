import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { FaqRoutes } from "../modules/faq/faq.route";
import { MediaRoutes } from "../modules/media/media.route";
import { paymentRoutes } from "../modules/payment/payment.routes";
import { stripeCEARoutes } from "../modules/stripeCEA/stripeCEA.routes";
import { transactionRoutes } from "../modules/transaction/transaction.routes";
import { artistRoutes } from "../modules/artist/artist.routes";
import { eventRoutes } from "../modules/event/event.routes";
import { OrderRoutes } from "../modules/order/order.routes";
import { contactRoutes } from "../modules/contuct/contuct.routes";
import { AboutUsRoutes } from "../modules/about/about-us.route";
import { RefundPolicyRoutes } from "../modules/refundPolicy/refund-policy.route";
import { PrivacyRoutes } from "../modules/privacy/privacy-policy.route";
import { TermsAndConditionsRoutes } from "../modules/terms/terms-and-conditions.route";
import { MailAdminRoutes } from "../modules/mailAdmin/mailAdmin.routes";
import { DashboardRoutes } from "../modules/dashboard/dashboard.routes";
import { TeamRoutes } from "../modules/team/team.routes";
import { RuleRoutes } from "../modules/rule/rule.route";

const router = express.Router();

const apiRoutes = [
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/events",
    route: eventRoutes,
  },
  {
    path: "/artists",
    route: artistRoutes,
  },
  {
    path: "/teams",
    route: TeamRoutes,

  },
  {
    path: "/orders",
    route: OrderRoutes,
  },

  {
    path: "/medias",
    route: MediaRoutes,
  },

  {
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/stripe-accounts",
    route: stripeCEARoutes,
  },
  {
    path: "/transactions",
    route: transactionRoutes,
  },

  {
    path: "/contacts",
    route: contactRoutes,
  },

  {
    path: "/faqs",
    route: FaqRoutes,
  },

  {
    path: "/about",
    route: AboutUsRoutes,
  },
  {
    path: "/refund-policies",
    route: RefundPolicyRoutes,
  },
  {
    path: "/privacy",
    route: PrivacyRoutes,
  },
  {
    path: "/terms",
    route: TermsAndConditionsRoutes,
  },
  {
    path: "/mail-admin",
    route: MailAdminRoutes,
  },

  {
    path: "/dashboard",
    route: DashboardRoutes,
  },
  {
    path: "/rules",
    route: RuleRoutes,
  }
];

apiRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
