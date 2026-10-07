# Guion para video de demostración

Duración sugerida: **8 minutos**. Adapte los nombres si participan dos o tres integrantes.

## 0:00 - 0:45 | Presentación

“Buenos días. Somos el equipo responsable de GameVault, una plataforma para administrar y descubrir videojuegos. El problema que resolvemos es tener títulos, plataformas, precios y existencias dispersos. Desde una sola interfaz podemos registrar, buscar, editar y eliminar videojuegos, además de marcar favoritos.”

Muestre la portada y mencione a los integrantes.

## 0:45 - 1:45 | Arquitectura

Muestre `docs/arquitectura.png` y explique:

“La aplicación utiliza cinco servicios dentro de una red de Docker Compose. NGINX es el único punto de entrada y el único que publica un puerto. Sirve el frontend y actúa como proxy inverso. Catalog API administra el CRUD y se conecta a PostgreSQL mediante el nombre de servicio `db`. Interactions API administra visitas y favoritos temporales en Redis mediante el nombre `cache`.”

Ejecute:

```powershell
docker compose ps
```

Señale los cinco servicios y la columna `PORTS`.

## 1:45 - 3:30 | CRUD completo

1. Cree un videojuego desde el formulario.
2. Búsquelo por nombre.
3. Edite su precio o cantidad disponible.
4. Elimine un videojuego de prueba.

Explique que las validaciones existen en dos niveles: HTML para respuesta inmediata y API para proteger los datos aunque la solicitud no venga del navegador.

## 3:30 - 4:20 | Funcionalidad distintiva

Use los filtros de género, plataforma y estado. Marque un videojuego como destacado.

“La característica distintiva es la clasificación automática del título como nuevo, clásico o próximo lanzamiento, combinada con filtros por género y plataforma. También podemos destacar los títulos recomendados.”

## 4:20 - 5:15 | Interacciones y Redis

Marque dos favoritos y muestre el total. Luego ejecute:

```powershell
docker compose restart cache
```

“Visitas y favoritos son temporales. Desactivamos RDB y AOF porque no son información crítica. Después de reiniciar Redis, los contadores regresan a cero. Esta decisión está documentada y permite demostrar el comportamiento solicitado.”

## 5:15 - 6:15 | Persistencia de PostgreSQL

Cree el videojuego `Prueba de persistencia`. Ejecute:

```powershell
docker compose down
docker compose up -d
```

Espere y vuelva a buscar el videojuego.

“PostgreSQL usa el volumen nombrado `gamevault_postgres_data`. El contenedor se eliminó, pero los archivos de la base permanecieron y el videojuego continúa disponible.”

## 6:15 - 7:00 | Aislamiento y errores

Muestre que 5432, 6379, 5000 y 5001 no están publicados. Detenga temporalmente `catalog-api` y muestre la respuesta 503 controlada. Iníciela de nuevo.

## 7:00 - 7:45 | Instalación reproducible

Muestre el ZIP y explique:

“En otra computadora solo se requiere descomprimir, copiar `.env.example` como `.env` y ejecutar `docker compose up -d --build`. Los Dockerfiles, dependencias, inicialización de base, frontend y documentación están incluidos.”

## 7:45 - 8:00 | Cierre

“GameVault cumple la arquitectura de cinco servicios, CRUD, personalización, persistencia, datos temporales, manejo de errores, aislamiento y despliegue reproducible. Gracias.”
