# Pruebas técnicas y evidencias

Realice las pruebas en el orden indicado. Guarde cada captura dentro de `evidencias/pruebas/` con el nombre sugerido.

## 1. Construcción e inicio

```powershell
docker compose up -d --build
docker compose ps
```

Resultado esperado: aparecen `nginx`, `catalog-api`, `interactions-api`, `db` y `cache`. Solo NGINX muestra un mapeo como `0.0.0.0:8080->80/tcp`.

Captura: `01-cinco-servicios.png`.

## 2. Acceso web

Abra `http://localhost:8080` y capture la portada junto con la barra del navegador.

Captura: `02-interfaz-principal.png`.

## 3. Comunicación interna

```powershell
Invoke-RestMethod http://localhost:8080/api/catalog/health
Invoke-RestMethod http://localhost:8080/api/interactions/health
```

Resultado esperado: `database: connected` y `redis: connected`.

Captura: `03-salud-servicios.png`.

## 4. Crear y consultar

Desde la interfaz pulse **Nuevo videojuego**, complete el formulario y guarde. Busque el videojuego por título.

Capturas:

- `04-videojuego-creado.png`
- `05-busqueda-videojuego.png`

## 5. Editar

Pulse **Editar**, cambie el precio o la cantidad disponible y guarde.

Captura: `06-videojuego-editado.png`.

## 6. Validación de errores

Abra el formulario, deje vacío el título o escriba precio `-1`. Intente guardar.

Resultado esperado: el navegador y la API muestran un mensaje comprensible.

Captura: `07-validacion.png`.

Prueba directa opcional:

```powershell
$body = @{ title = ""; price = -1 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/catalog/games -ContentType "application/json" -Body $body
```

## 7. Eliminar

Cree un videojuego de prueba, pulse **Eliminar** y confirme. Compruebe que ya no aparece.

Captura: `08-videojuego-eliminado.png`.

## 8. Persistencia de PostgreSQL

Cree un videojuego llamado `Prueba de persistencia Denilson`. Después ejecute:

```powershell
docker compose down
docker compose up -d
Start-Sleep -Seconds 8
```

Abra nuevamente la aplicación y busque el videojuego.

Resultado esperado: el registro sigue disponible.

Captura: `09-persistencia-postgresql.png`.

## 9. Datos temporales de Redis

Marque dos videojuegos como favoritos y observe los contadores. Ejecute:

```powershell
docker compose restart cache
Start-Sleep -Seconds 5
```

Recargue el navegador.

Resultado esperado: visitas y favoritos vuelven a cero porque RDB y AOF están desactivados.

Capturas:

- `10-redis-antes.png`
- `11-redis-despues.png`

## 10. Aislamiento

```powershell
Test-NetConnection localhost -Port 5432
Test-NetConnection localhost -Port 6379
Test-NetConnection localhost -Port 5000
Test-NetConnection localhost -Port 5001
```

Resultado esperado: `TcpTestSucceeded : False` en los cuatro puertos. Luego pruebe NGINX:

```powershell
Test-NetConnection localhost -Port 8080
```

Resultado esperado: `TcpTestSucceeded : True`.

Captura: `12-aislamiento-puertos.png`.

## 11. Servicio no disponible

```powershell
docker compose stop catalog-api
curl.exe -i http://localhost:8080/api/catalog/games
```

Resultado esperado: NGINX devuelve un error controlado 503. Luego recupere el servicio:

```powershell
docker compose start catalog-api
Start-Sleep -Seconds 5
curl.exe http://localhost:8080/api/catalog/games
```

Capturas:

- `13-api-no-disponible.png`
- `14-api-recuperada.png`

## 12. Reproducibilidad

En una computadora distinta:

1. Copie y descomprima el ZIP.
2. Ejecute `Copy-Item .env.example .env`.
3. Ejecute `docker compose up -d --build`.
4. Abra la aplicación y cree un videojuego.

Captura: `15-instalacion-otro-equipo.png`.

## Limpieza final

Para detener sin borrar PostgreSQL:

```powershell
docker compose down
```

No utilice `-v` hasta terminar la demostración de persistencia.
