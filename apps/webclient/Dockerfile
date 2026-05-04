FROM node:22-alpine AS builder

RUN npm install -g pnpm@9 --quiet

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/mission-control-admin/package.json apps/mission-control-admin/
COPY apps/ingestion-service/package.json      apps/ingestion-service/
COPY apps/webclient/package.json              apps/webclient/
COPY libs/shared/package.json                 libs/shared/
COPY libs/db/package.json                     libs/db/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json nx.json ./
COPY libs/        libs/
COPY apps/webclient/ apps/webclient/

RUN pnpm exec nx build webclient

FROM nginx:1.27-alpine AS runtime

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /workspace/dist/apps/webclient /usr/share/nginx/html

RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    gzip_static on;\n\
\n\
    # Proxy API calls to the NestJS service on the compose network.\n\
    location /api/ {\n\
        proxy_pass         http://mission-control-admin:3000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header   Host              $host;\n\
        proxy_set_header   X-Real-IP         $remote_addr;\n\
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;\n\
    }\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location ~* \\.(?:js|css|woff2?|png|svg|ico)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    location = /index.html {\n\
        add_header Cache-Control "no-store";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
