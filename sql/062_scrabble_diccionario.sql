-- ============================================================
-- HueScrabble: diccionario de palabras válidas. Sólo la tabla — el
-- contenido se carga aparte con inc/cli/importar_diccionario_scrabble.php
-- (no tiene sentido meter 600 mil INSERT en una migración SQL).
-- ============================================================

CREATE TABLE IF NOT EXISTS ScrabbleDiccionario (
    Palabra VARCHAR(20) NOT NULL,
    PRIMARY KEY (Palabra)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
