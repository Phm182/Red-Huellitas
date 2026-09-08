-- ============================================================
-- HuePlayFavorito (mismo molde que AdopcionFavorito/ProductoFavorito)
--
-- No se navega como listado aparte en ningún lado de la app: sólo sirve
-- para ordenar "mis juegos" con los favoritos primero (home de HuePlay y
-- el selector de juego de la bandeja de duelos), así que no hace falta un
-- endpoint "mis_favoritos.php" — viaja embebido en perfil.php.
-- ============================================================
CREATE TABLE IF NOT EXISTS HuePlayFavorito (
    HuePlayFavoritoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId            INT UNSIGNED NOT NULL,
    JuegoCodigo       VARCHAR(30) NOT NULL,
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_HuePlayFavorito (UserId, JuegoCodigo),
    CONSTRAINT FK_HuePlayFavorito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
