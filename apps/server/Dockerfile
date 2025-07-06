# Use the official Bun image as base
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy the rest of your application code
COPY . .

# Install dependencies
RUN bun install

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Start the application
CMD ["bun", "run", "packages/server/src/index.ts"]
