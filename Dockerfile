FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy all application files
COPY . .

# Build the frontend assets with Vite
RUN npm run build

# Expose the application port (assuming the app runs on 3000 based on Express standard)
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
