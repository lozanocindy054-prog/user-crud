
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Install the Ionic CLI
RUN npm install -g @ionic/cli

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the remaining project files
COPY . .

# Expose the Ionic development server port
EXPOSE 8100

# Start the Ionic application
CMD ["ionic", "serve", "--host=0.0.0.0", "--port=8100", "--no-open"]
