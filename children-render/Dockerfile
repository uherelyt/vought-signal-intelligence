# ELAED / VoughtCord: Vercel Daemons public-beta staging image.
# No credentials are included in the image. The daemon is initially scaled to zero.
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
CMD ["sh", "-c", "node scripts/vercel-daemon-preflight.mjs && exec npm start"]
