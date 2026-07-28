-- Perfil visible de la cuenta MP del vendedor + tema del callback OAuth.
-- mysql -u root huellitas < sql/030_mp_vendedor_perfil.sql

SET NAMES utf8mb4;

ALTER TABLE UsuarioMpCuenta
    ADD COLUMN MpNombre VARCHAR(200) NULL AFTER MpEmail,
    ADD COLUMN MpTelefono VARCHAR(40) NULL AFTER MpNombre;

ALTER TABLE UsuarioMpOauthPendiente
    ADD COLUMN Theme VARCHAR(10) NOT NULL DEFAULT 'light' AFTER UserId;
