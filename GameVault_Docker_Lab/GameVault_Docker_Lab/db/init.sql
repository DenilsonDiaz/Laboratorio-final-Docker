CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(700) NOT NULL,
    genre VARCHAR(60) NOT NULL,
    platform VARCHAR(60) NOT NULL,
    release_date DATE NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price BETWEEN 0 AND 1000),
    stock INTEGER NOT NULL CHECK (stock BETWEEN 0 AND 10000),
    developer VARCHAR(120) NOT NULL,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_title ON games (title);
CREATE INDEX IF NOT EXISTS idx_games_genre ON games (genre);
CREATE INDEX IF NOT EXISTS idx_games_platform ON games (platform);
CREATE INDEX IF NOT EXISTS idx_games_release_date ON games (release_date);

INSERT INTO games
    (title, description, genre, platform, release_date, price, stock, developer, featured)
VALUES
    ('Nebula Raiders',
     'Explora una galaxia abierta, mejora tu nave y descubre civilizaciones perdidas.',
     'Aventura', 'PC', '2026-08-14', 39.99, 80, 'Orion Forge', TRUE),
    ('Kingdoms of Ember',
     'RPG de fantasía con decisiones que cambian alianzas, territorios y el desenlace.',
     'RPG', 'PlayStation 5', '2025-11-21', 59.99, 42, 'Ashen Crown Studio', TRUE),
    ('Turbo Circuit',
     'Carreras arcade competitivas con pistas dinámicas y personalización de vehículos.',
     'Deportes', 'Xbox Series', '2024-06-07', 34.50, 25, 'Velocity Lab', FALSE),
    ('Pixel Farm Stories',
     'Construye una granja, conoce a sus habitantes y transforma un pequeño pueblo.',
     'Simulación', 'Nintendo Switch', '2023-03-18', 24.99, 120, 'Mango Byte', FALSE),
    ('Iron Tactics Zero',
     'Estrategia por turnos con escuadrones personalizables y campañas rejugables.',
     'Estrategia', 'PC', '2027-02-12', 44.99, 0, 'North Grid Games', TRUE)
ON CONFLICT DO NOTHING;
