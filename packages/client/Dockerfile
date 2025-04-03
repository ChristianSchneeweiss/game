# Use the official Bun image as base
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy the rest of your application code
COPY . .

# Install dependencies
RUN bun install

ARG VITE_SUPABASE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_API_URL

# Log environment variables for debugging
RUN echo "VITE_SUPABASE_KEY: $VITE_SUPABASE_KEY"
RUN echo "VITE_SUPABASE_URL: $VITE_SUPABASE_URL" 
RUN echo "VITE_API_URL: $VITE_API_URL"


ENV VITE_SUPABASE_KEY=$VITE_SUPABASE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_API_URL=$VITE_API_URL


# Build the Vite application
RUN bun run build:client

# Expose the port
EXPOSE 3000

# Serve the built files with Bun
CMD ["bunx", "serve", "packages/client/dist"]
