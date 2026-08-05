<?php
/**
 * Seguridad infantil: edad, tutela y quién puede hablarle a quién.
 *
 * Todo el resto del código debe consultar `rh_chat_permitido()` y no rearmar
 * las reglas por su cuenta. Es el mismo criterio que `rh_puede_ver_perfil()`:
 * con la lógica repartida, alcanza con olvidarse de un endpoint para que la
 * protección sea decorativa.
 */

/** Edad por debajo de la cual aplican las restricciones. */
const RH_EDAD_MENOR = 13;

/** Edad máxima aceptada al cargar la fecha: más que esto es un error de tipeo. */
const RH_EDAD_MAXIMA = 120;

/**
 * Valida y normaliza una fecha de nacimiento en formato YYYY-MM-DD.
 *
 * Devuelve ['ok'=>true,'fecha'=>'YYYY-MM-DD','edad'=>int] o ['ok'=>false,'error'=>string].
 *
 * Se valida con `checkdate()` y no sólo con una expresión regular porque
 * '2011-02-31' matchea cualquier patrón de fecha pero no existe, y MySQL la
 * guardaría como '0000-00-00' dejando una edad basura sobre la que después se
 * decide si alguien es menor.
 */
function rh_validar_fecha_nacimiento(string $valor): array
{
    $valor = trim($valor);
    if ($valor === '') {
        return ['ok' => false, 'error' => 'La fecha de nacimiento es obligatoria'];
    }
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $valor, $m)) {
        return ['ok' => false, 'error' => 'Formato de fecha inválido (AAAA-MM-DD)'];
    }
    [, $anio, $mes, $dia] = array_map('intval', $m);
    if (!checkdate($mes, $dia, $anio)) {
        return ['ok' => false, 'error' => 'Esa fecha no existe'];
    }

    $nac = new DateTimeImmutable($valor);
    $hoy = new DateTimeImmutable('today');
    if ($nac > $hoy) {
        return ['ok' => false, 'error' => 'La fecha no puede ser futura'];
    }

    $edad = (int) $nac->diff($hoy)->y;
    if ($edad > RH_EDAD_MAXIMA) {
        return ['ok' => false, 'error' => 'Revisá la fecha, la edad no es válida'];
    }

    return ['ok' => true, 'fecha' => $nac->format('Y-m-d'), 'edad' => $edad];
}

/**
 * Edad en años a partir de FechaNacimiento, o null si nunca la cargó.
 */
function rh_edad_de(mysqli $conn, int $userId): ?int
{
    $stmt = $conn->prepare(
        'SELECT TIMESTAMPDIFF(YEAR, FechaNacimiento, CURDATE()) AS Edad
           FROM Usuario
          WHERE UserId = ? AND FechaNacimiento IS NOT NULL'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? (int) $row['Edad'] : null;
}

/**
 * ¿Es menor de 13?
 *
 * Sin fecha cargada devuelve TRUE a propósito. Si el dato falta no se puede
 * afirmar que sea adulto, y ante la duda corresponde restringir: tratarlo como
 * adulto dejaría a cualquier cuenta vieja fuera de la protección con sólo no
 * completar el campo.
 */
function rh_es_menor(mysqli $conn, int $userId): bool
{
    $edad = rh_edad_de($conn, $userId);
    return $edad === null || $edad < RH_EDAD_MENOR;
}

/** UserId del tutor con tutela aceptada, o null si no tiene. */
function rh_tutor_de(mysqli $conn, int $userId): ?int
{
    $stmt = $conn->prepare(
        "SELECT UserIdTutor FROM Tutela
          WHERE UserIdMenor = ? AND Estado = 'aceptada'
          ORDER BY ResueltaEn DESC LIMIT 1"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? (int) $row['UserIdTutor'] : null;
}

/** ¿Se siguen mutuamente? Hace falta el vínculo en los DOS sentidos. */
function rh_son_mutuos(mysqli $conn, int $a, int $b): bool
{
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS N FROM Seguimiento
          WHERE (UserIdSeguidor = ? AND UserIdSeguido = ?)
             OR (UserIdSeguidor = ? AND UserIdSeguido = ?)'
    );
    $stmt->bind_param('iiii', $a, $b, $b, $a);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return ((int) ($row['N'] ?? 0)) >= 2;
}

/**
 * Estado de la autorización del tutor para una conversación de un menor.
 * Devuelve 'pendiente' | 'autorizada' | 'bloqueada' | null (no existe la fila).
 */
function rh_autorizacion_estado(mysqli $conn, int $conversacionId, int $userIdMenor): ?string
{
    $stmt = $conn->prepare(
        'SELECT Estado FROM ConversacionAutorizacion
          WHERE ConversacionId = ? AND UserIdMenor = ?'
    );
    $stmt->bind_param('ii', $conversacionId, $userIdMenor);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? (string) $row['Estado'] : null;
}

/**
 * Crea la fila de autorización si falta, para que el tutor la vea pendiente.
 * Idempotente: si ya existe no la pisa (no queremos re-pedir permiso de algo
 * que el tutor ya resolvió).
 */
function rh_autorizacion_asegurar(mysqli $conn, int $conversacionId, int $userIdMenor): void
{
    $tutor = rh_tutor_de($conn, $userIdMenor);
    $stmt = $conn->prepare(
        'INSERT IGNORE INTO ConversacionAutorizacion (ConversacionId, UserIdMenor, UserIdTutor)
         VALUES (?, ?, ?)'
    );
    $stmt->bind_param('iii', $conversacionId, $userIdMenor, $tutor);
    $stmt->execute();
    $stmt->close();
}

/**
 * LA PUERTA. ¿Puede $emisor hablar con $destino?
 *
 * Si ninguno de los dos es menor, se permite (el resto de las reglas de
 * relación las sigue manejando `rh_chat_hay_relacion()` para la bandeja de
 * solicitudes; esto es una capa aparte y más estricta).
 *
 * Si alguno es menor, se exigen las tres cosas a la vez:
 *   1. que se sigan mutuamente,
 *   2. que el menor tenga un tutor con tutela aceptada,
 *   3. que el tutor haya autorizado esa conversación puntual.
 *
 * $conversacionId puede venir null cuando todavía no existe la conversación
 * (caso "abrir"): ahí se validan 1 y 2, y la 3 se resuelve creando la fila
 * pendiente para que el tutor decida.
 *
 * @return array{ok:bool, motivo:string}
 */
function rh_chat_permitido(mysqli $conn, int $emisor, int $destino, ?int $conversacionId = null): array
{
    $emisorMenor = rh_es_menor($conn, $emisor);
    $destinoMenor = rh_es_menor($conn, $destino);

    if (!$emisorMenor && !$destinoMenor) {
        return ['ok' => true, 'motivo' => ''];
    }

    if (!rh_son_mutuos($conn, $emisor, $destino)) {
        return [
            'ok' => false,
            'motivo' => 'menor_sin_seguimiento_mutuo',
        ];
    }

    // Cada menor involucrado tiene que estar habilitado por su propio tutor.
    foreach ([[$emisor, $emisorMenor], [$destino, $destinoMenor]] as [$uid, $esMenor]) {
        if (!$esMenor) {
            continue;
        }
        if (rh_tutor_de($conn, $uid) === null) {
            return ['ok' => false, 'motivo' => 'menor_sin_tutor'];
        }
        if ($conversacionId !== null) {
            $estado = rh_autorizacion_estado($conn, $conversacionId, $uid);
            if ($estado === 'bloqueada') {
                return ['ok' => false, 'motivo' => 'conversacion_bloqueada'];
            }
            if ($estado !== 'autorizada') {
                return ['ok' => false, 'motivo' => 'esperando_autorizacion'];
            }
        }
    }

    return ['ok' => true, 'motivo' => ''];
}

/** Mensaje para el usuario según el motivo del rechazo. */
function rh_chat_motivo_texto(string $motivo): string
{
    switch ($motivo) {
        case 'menor_sin_seguimiento_mutuo':
            return 'Para chatear con una cuenta de menor de 13, ambos se tienen que seguir.';
        case 'menor_sin_tutor':
            return 'Esta cuenta es de un menor de 13 y todavía no tiene un adulto responsable vinculado.';
        case 'esperando_autorizacion':
            return 'La conversación espera la autorización del adulto responsable.';
        case 'conversacion_bloqueada':
            return 'El adulto responsable bloqueó esta conversación.';
        default:
            return 'No se puede iniciar esta conversación.';
    }
}
