#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🎨 Starting Artwork Marketplace API in Demo Mode');
console.log('================================================');
console.log('');
console.log('⚠️  DEMO MODE: Using in-memory database (data will not persist)');
console.log('📚 API Documentation: http://localhost:3000/api/v1/docs');
console.log('🌐 API Base URL: http://localhost:3000/api/v1');
console.log('');
console.log('🚀 Starting application...');
console.log('');

// Set demo environment variables
const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: '3000',
  API_PREFIX: 'api/v1',
  
  // Demo database settings (will use SQLite in memory)
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USERNAME: 'demo',
  DATABASE_PASSWORD: 'demo',
  DATABASE_NAME: 'demo',
  
  // Demo JWT settings
  JWT_SECRET: 'demo-jwt-secret-key-for-development-only',
  JWT_EXPIRES_IN: '7d',
  
  // Optional services (will be ignored in demo mode)
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  STRIPE_SECRET_KEY: 'sk_test_demo',
  STRIPE_WEBHOOK_SECRET: 'whsec_demo',
  SENDGRID_API_KEY: 'SG.demo',
  FROM_EMAIL: 'demo@example.com',
  AWS_ACCESS_KEY_ID: 'demo',
  AWS_SECRET_ACCESS_KEY: 'demo',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET: 'demo-bucket',
};

// Start the NestJS application
const child = spawn('npm', ['run', 'start:dev'], {
  stdio: 'inherit',
  env: env,
  shell: true
});

child.on('close', (code) => {
  console.log(`\n🛑 Application stopped with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping application...');
  child.kill('SIGINT');
});