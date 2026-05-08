FROM node:18-alpine AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx tsc

FROM node:18-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/knexfile.ts ./
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/config ./config
EXPOSE 4000
USER appuser
CMD ["node", "dist/index.js"]
