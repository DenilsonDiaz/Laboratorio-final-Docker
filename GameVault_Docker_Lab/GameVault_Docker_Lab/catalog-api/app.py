import os
from datetime import date, datetime, timedelta

import psycopg  # type: ignore[reportMissingImports]
from flask import Flask, jsonify, request
from psycopg.rows import dict_row  # type: ignore[reportMissingImports]


app = Flask(__name__)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "db"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "gamevault"),
    "user": os.getenv("DB_USER", "gamevault_user"),
    "password": os.getenv("DB_PASSWORD", ""),
}

ALLOWED_GENRES = {
    "Acción",
    "Aventura",
    "Deportes",
    "Estrategia",
    "Indie",
    "RPG",
    "Simulación",
}

ALLOWED_PLATFORMS = {"PC", "PlayStation 5", "Xbox Series", "Nintendo Switch"}


def get_connection():
    return psycopg.connect(**DB_CONFIG, row_factory=dict_row)


def game_status(release_date):
    today = date.today()
    if release_date > today:
        return "proximamente"
    if release_date >= today - timedelta(days=365):
        return "nuevo"
    return "clasico"


def serialize_game(row):
    game = dict(row)
    for key in ("release_date", "created_at", "updated_at"):
        if game.get(key) is not None:
            game[key] = game[key].isoformat()
    game["price"] = float(game["price"])
    game["status"] = game_status(row["release_date"])
    return game


def validate_payload(payload):
    required = [
        "title",
        "description",
        "genre",
        "platform",
        "release_date",
        "price",
        "stock",
        "developer",
    ]
    errors = {}

    if not isinstance(payload, dict):
        return {"body": "El cuerpo de la solicitud debe ser JSON."}

    for field in required:
        if payload.get(field) in (None, ""):
            errors[field] = "Este campo es obligatorio."

    text_limits = {"title": 120, "description": 700, "developer": 120}
    for field, limit in text_limits.items():
        if field in payload:
            value = str(payload[field]).strip()
            if not value:
                errors[field] = "No puede quedar vacío."
            elif len(value) > limit:
                errors[field] = f"Máximo {limit} caracteres."

    if "genre" in payload and payload["genre"] not in ALLOWED_GENRES:
        errors["genre"] = "Seleccione un género válido."
    if "platform" in payload and payload["platform"] not in ALLOWED_PLATFORMS:
        errors["platform"] = "Seleccione una plataforma válida."

    if "price" in payload:
        try:
            price = float(payload["price"])
            if price < 0 or price > 1000:
                errors["price"] = "El precio debe estar entre 0 y 1000."
        except (TypeError, ValueError):
            errors["price"] = "El precio debe ser numérico."

    if "stock" in payload:
        try:
            stock = int(payload["stock"])
            if stock < 0 or stock > 10000:
                errors["stock"] = "El stock debe estar entre 0 y 10000."
        except (TypeError, ValueError):
            errors["stock"] = "El stock debe ser un número entero."

    if "release_date" in payload:
        try:
            datetime.strptime(payload["release_date"], "%Y-%m-%d")
        except (TypeError, ValueError):
            errors["release_date"] = "Use el formato AAAA-MM-DD."

    return errors


def clean_payload(payload):
    cleaned = {}
    for field in ("title", "description", "genre", "platform", "developer"):
        cleaned[field] = str(payload[field]).strip()
    cleaned["release_date"] = payload["release_date"]
    cleaned["price"] = float(payload["price"])
    cleaned["stock"] = int(payload["stock"])
    cleaned["featured"] = bool(payload.get("featured", False))
    return cleaned


@app.get("/health")
def health():
    try:
        with get_connection() as connection:
            connection.execute("SELECT 1")
        return jsonify({"status": "ok", "service": "catalog-api", "database": "connected"})
    except psycopg.Error:
        return jsonify({"status": "error", "service": "catalog-api", "database": "unavailable"}), 503


@app.get("/games/options")
def options():
    return jsonify({"genres": sorted(ALLOWED_GENRES), "platforms": sorted(ALLOWED_PLATFORMS)})


@app.get("/games")
def list_games():
    query = request.args.get("q", "").strip()
    genre = request.args.get("genre", "").strip()
    platform = request.args.get("platform", "").strip()
    status = request.args.get("status", "").strip()
    featured = request.args.get("featured", "").strip().lower()
    clauses = []
    params = []

    if query:
        clauses.append("(title ILIKE %s OR description ILIKE %s OR developer ILIKE %s)")
        pattern = f"%{query}%"
        params.extend([pattern, pattern, pattern])
    if genre:
        clauses.append("genre = %s")
        params.append(genre)
    if platform:
        clauses.append("platform = %s")
        params.append(platform)
    if status == "proximamente":
        clauses.append("release_date > CURRENT_DATE")
    elif status == "nuevo":
        clauses.append("release_date <= CURRENT_DATE AND release_date >= CURRENT_DATE - INTERVAL '365 days'")
    elif status == "clasico":
        clauses.append("release_date < CURRENT_DATE - INTERVAL '365 days'")
    if featured in {"true", "false"}:
        clauses.append("featured = %s")
        params.append(featured == "true")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    sql = f"""
        SELECT id, title, description, genre, platform, release_date,
               price, stock, developer, featured, created_at, updated_at
        FROM games
        {where}
        ORDER BY featured DESC, release_date DESC, id DESC
    """
    with get_connection() as connection:
        rows = connection.execute(sql, params).fetchall()
    return jsonify({"items": [serialize_game(row) for row in rows], "total": len(rows)})


@app.get("/games/<int:game_id>")
def get_game(game_id):
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM games WHERE id = %s", (game_id,)).fetchone()
    if not row:
        return jsonify({"error": "Videojuego no encontrado."}), 404
    return jsonify(serialize_game(row))


@app.post("/games")
def create_game():
    payload = request.get_json(silent=True)
    errors = validate_payload(payload)
    if errors:
        return jsonify({"error": "Revise los datos ingresados.", "details": errors}), 400
    values = clean_payload(payload)
    sql = """
        INSERT INTO games
            (title, description, genre, platform, release_date, price,
             stock, developer, featured)
        VALUES
            (%(title)s, %(description)s, %(genre)s, %(platform)s,
             %(release_date)s, %(price)s, %(stock)s, %(developer)s,
             %(featured)s)
        RETURNING *
    """
    with get_connection() as connection:
        row = connection.execute(sql, values).fetchone()
        connection.commit()
    return jsonify(serialize_game(row)), 201


@app.put("/games/<int:game_id>")
def update_game(game_id):
    payload = request.get_json(silent=True)
    errors = validate_payload(payload)
    if errors:
        return jsonify({"error": "Revise los datos ingresados.", "details": errors}), 400
    values = clean_payload(payload)
    values["id"] = game_id
    sql = """
        UPDATE games SET
            title = %(title)s,
            description = %(description)s,
            genre = %(genre)s,
            platform = %(platform)s,
            release_date = %(release_date)s,
            price = %(price)s,
            stock = %(stock)s,
            developer = %(developer)s,
            featured = %(featured)s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %(id)s
        RETURNING *
    """
    with get_connection() as connection:
        row = connection.execute(sql, values).fetchone()
        connection.commit()
    if not row:
        return jsonify({"error": "Videojuego no encontrado."}), 404
    return jsonify(serialize_game(row))


@app.delete("/games/<int:game_id>")
def delete_game(game_id):
    with get_connection() as connection:
        row = connection.execute(
            "DELETE FROM games WHERE id = %s RETURNING id, title", (game_id,)
        ).fetchone()
        connection.commit()
    if not row:
        return jsonify({"error": "Videojuego no encontrado."}), 404
    return jsonify({"message": "Videojuego eliminado correctamente.", "game": row})


@app.errorhandler(psycopg.Error)
def database_error(_error):
    return jsonify({"error": "No fue posible comunicarse con PostgreSQL."}), 503


@app.errorhandler(404)
def route_not_found(_error):
    return jsonify({"error": "Ruta no encontrada."}), 404


@app.errorhandler(500)
def internal_error(_error):
    return jsonify({"error": "Ocurrió un error interno inesperado."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("API_PORT", "5000")), debug=False)
