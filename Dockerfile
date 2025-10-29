# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

# Install kubectl
RUN apk add --no-cache curl && \
    KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt) && \
    curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/ && \
    apk del curl

WORKDIR /app

# Copy built application and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY server ./server

# Install production dependencies only
RUN npm ci --only=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set permissions
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080

ENV PORT=8080
ENV KUBECONFIG=/etc/kubeconfig/kubeconfig

CMD ["node", "server/index.js"]
