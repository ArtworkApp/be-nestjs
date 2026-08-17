import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Database Configuration
  DATABASE_URL: Joi.string().required(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().default('postgres'),
  DATABASE_NAME: Joi.string().default('artwork_db'),

  // JWT Configuration
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Stripe Configuration
  STRIPE_SECRET_KEY: Joi.string().default('sk_test_placeholder'),
  STRIPE_WEBHOOK_SECRET: Joi.string().default('whsec_placeholder'),

  // SendGrid Configuration
  SENDGRID_API_KEY: Joi.string().default('SG.placeholder'),
  FROM_EMAIL: Joi.string().email().default('dev@example.com'),

  // AWS S3 Configuration
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().default('artwork-local-bucket'),

  // Application
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PREFIX: Joi.string().default('api/v1'),
  MAX_FILE_SIZE: Joi.number().default(10485760),
  ALLOWED_IMAGE_TYPES: Joi.string().default('image/jpeg,image/png,image/webp'),
});

export default () => ({
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5433,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL,
  },
  aws: {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET,
  },
  app: {
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV,
    apiPrefix: process.env.API_PREFIX,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10),
    allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES?.split(','),
  },
});
