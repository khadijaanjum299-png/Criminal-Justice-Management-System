# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
RUN apk add --no-cache gettext

COPY --from=builder /app/build /usr/share/nginx/html

# Copy as template — nginx image auto-substitutes env vars
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]