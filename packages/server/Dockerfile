# Use the official Bun image as base
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb (if it exists)
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Start the application
CMD ["bun", "run", "src/index.ts"]
