import os
import re

import redis
from flask import Flask, jsonify, request


app = Flask(__name__)

cache = redis.Redis(
    host=os.getenv("REDIS_HOST", "cache"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=True,
    socket_connect_timeout=3,
    socket_timeout=3,
)

KEY_PREFIX = "gamevault"
CLIENT_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{8,80}$")


def favorite_key(game_id):
    return f"{KEY_PREFIX}:game:{game_id}:favorites"


def validate_client_id(client_id):
    return isinstance(client_id, str) and CLIENT_PATTERN.fullmatch(client_id) is not None


@app.get("/health")
def health():
    try:
        cache.ping()
        return jsonify({"status": "ok", "service": "interactions-api", "redis": "connected"})
    except redis.RedisError:
        return jsonify({"status": "error", "service": "interactions-api", "redis": "unavailable"}), 503


@app.post("/visits")
def register_visit():
    total = cache.incr(f"{KEY_PREFIX}:visits")
    return jsonify({"message": "Visita registrada.", "visits": total}), 201


@app.get("/stats")
def get_stats():
    visits = int(cache.get(f"{KEY_PREFIX}:visits") or 0)
    favorite_keys = cache.keys(f"{KEY_PREFIX}:game:*:favorites")
    favorites = sum(cache.scard(key) for key in favorite_keys)
    return jsonify({"visits": visits, "favorites": favorites, "temporary": True})


@app.get("/games/<int:game_id>/favorite")
def get_favorite(game_id):
    client_id = request.args.get("client_id", "")
    if not validate_client_id(client_id):
        return jsonify({"error": "Identificador de cliente inválido."}), 400
    key = favorite_key(game_id)
    return jsonify(
        {
            "game_id": game_id,
            "favorite": bool(cache.sismember(key, client_id)),
            "favorites": cache.scard(key),
        }
    )


@app.post("/games/<int:game_id>/favorite")
def toggle_favorite(game_id):
    payload = request.get_json(silent=True) or {}
    client_id = payload.get("client_id", "")
    if not validate_client_id(client_id):
        return jsonify({"error": "Identificador de cliente inválido."}), 400

    key = favorite_key(game_id)
    if cache.sismember(key, client_id):
        cache.srem(key, client_id)
        favorite = False
        message = "Videojuego retirado de favoritos."
    else:
        cache.sadd(key, client_id)
        favorite = True
        message = "Videojuego agregado a favoritos."

    return jsonify(
        {
            "message": message,
            "game_id": game_id,
            "favorite": favorite,
            "favorites": cache.scard(key),
        }
    )


@app.get("/games/favorites")
def favorite_counts():
    result = {}
    for key in cache.keys(f"{KEY_PREFIX}:game:*:favorites"):
        game_id = key.split(":")[2]
        result[game_id] = cache.scard(key)
    return jsonify({"items": result})


@app.errorhandler(redis.RedisError)
def redis_error(_error):
    return jsonify({"error": "Redis no está disponible temporalmente."}), 503


@app.errorhandler(404)
def route_not_found(_error):
    return jsonify({"error": "Ruta no encontrada."}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("API_PORT", "5001")), debug=False)
