# Dockerfile for Silk Road Pipeline

# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time env vars for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files and build the app
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# ---- Serve stage ----
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
