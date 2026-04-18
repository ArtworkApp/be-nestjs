import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // MongoDB
  MONGO_URI: Joi.string().required(),

  // Application
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PREFIX: Joi.string().default('api/v1'),
});

export default () => ({
  mongo: {
    uri: process.env.MONGO_URI,
  },
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV,
    apiPrefix: process.env.API_PREFIX,
  },
});
