# Use the official Bun image as base
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy the rest of your application code
COPY . .

# Install dependencies
RUN bun install

# Build the Vite application
RUN bun run build:client

# Expose the port
EXPOSE 3000

# Serve the built files with Bun
CMD ["bunx", "serve", "packages/client/dist", "--port", "3000"]
