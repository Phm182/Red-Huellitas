-- Amplía reacciones de publicaciones.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/042_reacciones_ampliadas.sql

SET NAMES utf8mb4;

ALTER TABLE PostReaccion
    MODIFY Tipo ENUM(
        'like',
        'me_divierte',
        'amor',
        'asombro',
        'triste',
        'abrazo',
        'huella',
        'apoyo',
        'guau',
        'michi'
    ) NOT NULL;
