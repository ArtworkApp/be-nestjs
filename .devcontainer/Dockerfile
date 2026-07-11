FROM node:20-bookworm

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Install useful dev tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    redis-tools \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Pre-install dependencies (layer cache)
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
