FROM nginx:1.27-alpine

COPY nginx/nginx.conf /etc/nginx/templates/default.conf.template
COPY frontend/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost/nginx-health || exit 1
