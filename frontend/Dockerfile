# Step 1: build the site (npm run build makes the static files in /app/dist)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# the API lives on the same domain, under /api (Caddy forwards it), so no CORS is needed
ENV VITE_API_URL=/api
RUN npm run build

# Step 2: Caddy serves those files, forwards /api to the API and gets the HTTPS certificate
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
