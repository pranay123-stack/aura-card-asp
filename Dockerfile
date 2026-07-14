# syntax=docker/dockerfile:1
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ---

FROM node:20-slim AS runtime

# sharp renders the card's SVG through librsvg, which resolves fonts via fontconfig.
# Without these the card composites fine but every glyph is a blank box — the single
# most likely way this breaks in a container and not on your laptop.
RUN apt-get update && apt-get install -y --no-install-recommends \
      fonts-dejavu-core \
      fonts-liberation \
      fontconfig \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Render injects PORT; default matches config.ts.
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "dist/src/server.js"]
