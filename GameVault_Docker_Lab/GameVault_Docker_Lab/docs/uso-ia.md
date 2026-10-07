# Registro de uso de inteligencia artificial

Proyecto: **GameVault**  
Curso: **Redes II**  
Fecha: **2 de octubre de 2026**

El equipo revisó el código, ejecutó las pruebas técnicas y adaptó las propuestas a los requisitos del laboratorio. La IA se utilizó como apoyo de desarrollo y documentación, no como sustituto de la comprensión del proyecto.

| Tarea | Herramienta | Uso realizado | Validación del equipo |
|---|---|---|---|
| Arquitectura Docker | ChatGPT/Codex | Propuesta inicial de cinco servicios y red interna | Revisión de `docker compose config` y `docker compose ps` |
| API principal | ChatGPT/Codex | Estructura inicial del CRUD de videojuegos con Flask | Pruebas de crear, consultar, editar, filtrar y eliminar |
| Interacciones | ChatGPT/Codex | Lógica temporal de favoritos y visitas con Redis | Prueba antes y después de reiniciar `cache` |
| Configuración NGINX | ChatGPT/Codex y documentación oficial | Revisión de rutas del proxy inverso | Solicitudes a `/api/catalog/` y `/api/interactions/` |
| Interfaz | ChatGPT/Codex | Propuesta visual responsive y validaciones | Verificación manual en navegador y diferentes tamaños |
| Documentación | ChatGPT/Codex | Organización del README, pruebas y guion de video | Lectura del equipo y ejecución desde el ZIP |

## Prompts principales registrados

1. “Crear una aplicación personalizada con cinco servicios Docker Compose: NGINX, dos API Flask, PostgreSQL y Redis; solo NGINX debe publicar puerto.”
2. “Implementar un CRUD completo de videojuegos con búsqueda, filtros por género y plataforma, validaciones y mensajes de error.”
3. “Agregar favoritos y contador de visitas temporales con Redis y demostrar su pérdida controlada al reiniciarlo.”
4. “Diseñar una interfaz responsive con identidad propia para GameVault.”
5. “Documentar instalación, variables, servicios, API, persistencia, aislamiento, errores frecuentes y pruebas.”

## Responsabilidad del equipo

Antes de entregar se debe comprobar que:

- Los cinco contenedores estén en estado operativo.
- El CRUD funcione desde el navegador.
- PostgreSQL conserve los videojuegos después de reiniciar.
- Redis pierda los datos temporales al reiniciarse.
- Ningún servicio, excepto NGINX, publique puertos al host.
- Cada integrante pueda explicar y modificar el proyecto durante la defensa.
