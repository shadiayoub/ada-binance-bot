# Use the official Node.js runtime as the base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Start the application
CMD ["npm", "run", "start"] 
