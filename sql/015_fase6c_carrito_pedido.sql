-- Red Huellitas — Fase 6c: Carrito + Pedido + Comisión real vía Mercado Pago Marketplace
-- mysql -u root huellitas < sql/015_fase6c_carrito_pedido.sql

SET NAMES utf8mb4;

-- ============================================================
-- UsuarioMpCuenta (vinculación OAuth de la cuenta de Mercado Pago del vendedor)
-- ============================================================
CREATE TABLE IF NOT EXISTS UsuarioMpCuenta (
    UserId        INT UNSIGNED PRIMARY KEY,
    MpUserId      VARCHAR(60) NOT NULL,
    MpEmail       VARCHAR(150) NULL,
    AccessToken   TEXT NOT NULL,
    RefreshToken  TEXT NULL,
    ExpiresAt     DATETIME NULL,
    ConectadoEn   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_MpCuenta_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- UsuarioMpOauthPendiente (state de un flujo OAuth iniciado, un solo uso)
-- ============================================================
CREATE TABLE IF NOT EXISTS UsuarioMpOauthPendiente (
    State      VARCHAR(64) PRIMARY KEY,
    UserId     INT UNSIGNED NOT NULL,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_OauthPendiente_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Carrito / CarritoItem (uno activo por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS Carrito (
    CarritoId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId     INT UNSIGNED NOT NULL UNIQUE,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Carrito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CarritoItem (
    CarritoItemId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CarritoId      INT UNSIGNED NOT NULL,
    ProductoId     INT UNSIGNED NOT NULL,
    Cantidad       INT UNSIGNED NOT NULL DEFAULT 1,
    CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_CarritoItem (CarritoId, ProductoId),
    CONSTRAINT FK_CarritoItem_Carrito FOREIGN KEY (CarritoId) REFERENCES Carrito(CarritoId),
    CONSTRAINT FK_CarritoItem_Producto FOREIGN KEY (ProductoId) REFERENCES Producto(ProductoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Pedido / PedidoItem (un vendedor por pedido — el checkout separa el carrito)
-- ============================================================
CREATE TABLE IF NOT EXISTS Pedido (
    PedidoId            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CompradorUserId     INT UNSIGNED NOT NULL,
    VendedorUserId      INT UNSIGNED NOT NULL,
    MontoProductos      DECIMAL(10,2) NOT NULL,
    PorcentajeComision  DECIMAL(5,2) NOT NULL,
    MontoComision       DECIMAL(10,2) NOT NULL,
    MontoVendedor       DECIMAL(10,2) NOT NULL,
    MetodoPago          ENUM('mercadopago','coordinar') NOT NULL,
    MpPreferenceId      VARCHAR(60) NULL,
    MpPaymentId         VARCHAR(60) NULL,
    Estado              ENUM('pendiente','pagado','coordinando','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Pedido_Comprador (CompradorUserId),
    KEY IX_Pedido_Vendedor (VendedorUserId),
    CONSTRAINT FK_Pedido_Comprador FOREIGN KEY (CompradorUserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Pedido_Vendedor FOREIGN KEY (VendedorUserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PedidoItem (
    PedidoItemId    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PedidoId        INT UNSIGNED NOT NULL,
    ProductoId      INT UNSIGNED NOT NULL,
    NombreProducto  VARCHAR(150) NOT NULL,
    PrecioUnitario  DECIMAL(10,2) NOT NULL,
    Cantidad        INT UNSIGNED NOT NULL,
    CONSTRAINT FK_PedidoItem_Pedido FOREIGN KEY (PedidoId) REFERENCES Pedido(PedidoId),
    CONSTRAINT FK_PedidoItem_Producto FOREIGN KEY (ProductoId) REFERENCES Producto(ProductoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
