<?php
/**
 * Especies admitidas en mascotas, adopción, tránsito, donaciones, productos, etc.
 * Mantener alineado con app-movil/src/constants/especies.ts
 */
function rh_especies_validas(): array
{
    return ['perro', 'gato', 'conejo', 'ave', 'pez', 'hamster', 'cobayo', 'tortuga', 'huron', 'otro'];
}

/**
 * @return string|null especie normalizada, o null si $nullable y viene vacío
 */
function rh_validar_especie($especie, bool $nullable = false): ?string
{
    if ($especie === null || $especie === '') {
        if ($nullable) {
            return null;
        }
        json_error('Falta especie');
    }
    $especie = (string) $especie;
    if (!in_array($especie, rh_especies_validas(), true)) {
        json_error('Especie no válida');
    }
    return $especie;
}
