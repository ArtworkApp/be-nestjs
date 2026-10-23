import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Database Configuration
  DATABASE_URL: Joi.string().required(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5433),
  DATABASE_USERNAME: Joi.string().default('artwork_db_user'),
  DATABASE_PASSWORD: Joi.string().default('artwork_db_password'),
  DATABASE_NAME: Joi.string().default('artwork_db'),

  // JWT Configuration
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default(
        'local-access-secret-change-before-production',
      ),
    }),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default(
        'local-refresh-secret-change-before-production',
      ),
    }),
  JWT_ISSUER: Joi.string().default('artworkapp-api'),
  JWT_AUDIENCE: Joi.string().default('artworkapp-clients'),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().positive().default(2592000),

  // Stripe Configuration
  STRIPE_SECRET_KEY: Joi.string().default('sk_test_placeholder'),
  STRIPE_WEBHOOK_SECRET: Joi.string().default('whsec_placeholder'),

  // SendGrid Configuration
  SENDGRID_API_KEY: Joi.string().default('SG.placeholder'),
  FROM_EMAIL: Joi.string().email().default('dev@example.com'),

  // AWS S3 Configuration
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().default('artwork-local-bucket'),
  OBJECT_STORAGE_ENDPOINT: Joi.string().default('http://minio:9000'),
  OBJECT_STORAGE_ACCESS_KEY: Joi.string().default('minio_root_username'),
  OBJECT_STORAGE_SECRET_KEY: Joi.string().default('minio_root_secret_password'),
  OBJECT_STORAGE_BUCKET: Joi.string().default('artwork-images'),

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
  storage: {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY,
    secretKey: process.env.OBJECT_STORAGE_SECRET_KEY,
    bucket: process.env.OBJECT_STORAGE_BUCKET,
    region: process.env.AWS_REGION,
  },
  app: {
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV,
    apiPrefix: process.env.API_PREFIX,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10),
    allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES?.split(','),
  },
});
