import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  ip_address: process.env.IP,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  // cinetpay: {
  //   CINATPAY_SITE_ID: process.env.CINATPAY_SITE_ID!,
  //   CINATPAY_API_KEY: process.env.CINATPAY_API_KEY!,
  //   CINATPAY_SECRET_KEY: process.env.CINATPAY_SECRET_KEY!,
  //   BASE_URL: process.env.BASE_URL!,
  // },

  stripe: {
    stripeSecretKey: process.env.STRIPE_API_SECRET!,
    webhookSecret: process.env.WEBHOOK_SECRET!,
    paymentSuccess: process.env.WEBHOOK_SECRET!,
    premium_price_id: process.env.STRIPE_PREMIUM_PRICE_ID!,
    BASE_URL: process.env.BASE_URL!,
  },
  agora: {
    appId: process.env.AGORA_APP_ID,
    primaryCertificate: process.env.AGORA_PRIMARY_CERTIFICATE,
  },
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  support_receiver_email: process.env.SUPPORT_RECEIVER_EMAIL,
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    serviceSid: process.env.TWILIO_SERVICE_SID,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  },
};
