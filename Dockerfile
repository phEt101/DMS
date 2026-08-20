FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.js ./
COPY src ./src
RUN npm run build

FROM httpd:2.4-alpine

RUN sed -i \
      -e 's/^#LoadModule proxy_module/LoadModule proxy_module/' \
      -e 's/^#LoadModule proxy_http_module/LoadModule proxy_http_module/' \
      -e 's/^#LoadModule rewrite_module/LoadModule rewrite_module/' \
      /usr/local/apache2/conf/httpd.conf \
    && printf '\nInclude conf/extra/boswell-dms.conf\n' >> /usr/local/apache2/conf/httpd.conf

COPY --from=frontend-build /app/dist/ /usr/local/apache2/htdocs/
COPY config/apache/docker.conf /usr/local/apache2/conf/extra/boswell-dms.conf

EXPOSE 80
