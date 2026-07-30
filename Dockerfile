FROM node:20-alpine AS build

WORKDIR /app

RUN npm install -g @angular/cli

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build:shared && \
    npm run build:sso && \
    npm run build:rh && \
    npm run build:finance && \
    npm run build:dashboard

FROM nginx:alpine

RUN apk add --no-cache curl

COPY --from=build /app/dist/sso/browser /usr/share/nginx/html/sso
COPY --from=build /app/dist/rh-app/browser /usr/share/nginx/html/rh
COPY --from=build /app/dist/finance-app/browser /usr/share/nginx/html/finance
COPY --from=build /app/dist/dashboard-app/browser /usr/share/nginx/html/dashboard

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
