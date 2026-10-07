# Guía breve para la defensa

## Explicación central

GameVault separa responsabilidades. NGINX recibe todas las solicitudes. El frontend nunca conoce directamente las direcciones de PostgreSQL o Redis. Las API se comunican por DNS interno de Docker Compose: `catalog-api` usa `db` y `interactions-api` usa `cache`.

## ¿Por qué cinco servicios?

- NGINX: interfaz y entrada única.
- Catalog API: reglas del CRUD.
- Interactions API: funciones temporales independientes.
- PostgreSQL: registros permanentes y estructurados.
- Redis: contadores y conjuntos rápidos que pueden perderse.

## ¿Por qué PostgreSQL y Redis no publican puertos?

Porque solo deben recibir conexiones desde los servicios de la red de Compose. Reducir puntos de entrada mejora el aislamiento. Para administrarlos durante la práctica se usa `docker compose exec`, no `localhost:5432` ni `localhost:6379`.

## ¿Qué hace NGINX?

- Sirve `index.html`, `styles.css` y `app.js`.
- Envía `/api/catalog/` hacia `catalog-api:5000`.
- Envía `/api/interactions/` hacia `interactions-api:5001`.
- Devuelve una respuesta controlada cuando una API no está disponible.

## ¿Cómo se garantiza la persistencia?

El volumen `gamevault_postgres_data` se monta en `/var/lib/postgresql/data`. `docker compose down` elimina contenedores y red, pero conserva el volumen. `docker compose down -v` sí lo elimina.

## ¿Por qué Redis pierde información?

Redis se ejecuta con `--save "" --appendonly no`. RDB y AOF quedan desactivados. Visitas y favoritos son datos temporales, por lo que esta pérdida es aceptable y deliberada.

## ¿Dónde están las validaciones?

- Frontend: atributos `required`, límites de longitud y rangos para precio y existencias.
- Catalog API: valida campos obligatorios, géneros, plataformas, fecha, precio y stock.
- PostgreSQL: `NOT NULL`, tipo de dato y restricción `CHECK`.

## Preguntas probables

### ¿Qué ocurre si se cae Catalog API?

NGINX sigue sirviendo la interfaz. Las operaciones CRUD reciben un error 503 y muestran un mensaje. Interactions API y Redis continúan separados.

### ¿Qué diferencia hay entre `expose` y `ports`?

`expose` documenta/habilita el puerto dentro de la red de contenedores. `ports` publica un puerto hacia el host. En este proyecto solo NGINX usa `ports`.

### ¿Para qué sirve `depends_on` con `service_healthy`?

Evita iniciar una API antes de que su base correspondiente responda al `healthcheck`. No sustituye completamente el manejo de reconexiones, pero ordena el arranque.

### ¿Qué hace `docker compose config`?

Valida la estructura del archivo Compose y muestra el resultado después de sustituir variables de `.env`.

### ¿Cómo agregar otro género?

Se agrega en `ALLOWED_GENRES` de `catalog-api/app.py`. La interfaz obtiene los géneros desde la API, por lo que no necesita duplicar esa lista.

### ¿Cómo modificar el puerto público?

Se cambia `APP_PORT` en `.env`, por ejemplo `8085`, y se recrea NGINX con `docker compose up -d`.

### ¿Qué modificaría para producción?

Usaría secretos, HTTPS, autenticación, migraciones versionadas, Gunicorn, copias de seguridad, límites de solicitudes, observabilidad y Redis con persistencia o servicio administrado según el negocio.
