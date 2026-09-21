import { ESPECIES, especieI18nKey } from '../../constants/especies';
import { Adopcion, Campania, Donacion, Especie, Perdido, Producto, Transito, Veterinaria } from '../../types';
import { Equipo } from '../../types/equipo';
import { FiltroDef, FiltrosConfig, Opcion, Orden } from './Filtros';

type T = (k: string, o?: Record<string, unknown>) => string;

const DIA = 86400000;

const ms = (s: string | null | undefined): number => (s ? new Date(s.replace(' ', 'T')).getTime() || 0 : 0);
const conFoto = (fotos: unknown[] | undefined) => (fotos?.length ?? 0) > 0;

function sexo(t: T): Opcion[] {
  return [
    { valor: 'macho', label: t('filtros.macho') },
    { valor: 'hembra', label: t('filtros.hembra') },
  ];
}
function especies(t: T): Opcion[] {
  return ESPECIES.map((e: Especie) => ({ valor: e, label: t(especieI18nKey(e)) }));
}
function siNo(t: T): Opcion[] {
  return [{ valor: 'si', label: t('filtros.si') }];
}
const porFecha = <X extends { createdAt: string }>(t: T): Orden<X>[] => [
  { valor: 'nuevas', label: t('filtros.masNuevas'), cmp: (a, b) => ms(b.createdAt) - ms(a.createdAt) },
  { valor: 'viejas', label: t('filtros.masViejas'), cmp: (a, b) => ms(a.createdAt) - ms(b.createdAt) },
];
const porDistancia = <X extends { distanciaKm: number | null }>(t: T): Orden<X> => ({
  valor: 'cerca',
  label: t('filtros.masCerca'),
  cmp: (a, b) => (a.distanciaKm ?? 1e9) - (b.distanciaKm ?? 1e9),
});
const publicadoEn = <X extends { createdAt: string }>(t: T): FiltroDef<X> => ({
  key: 'publicado',
  titulo: t('filtros.publicado'),
  opciones: [
    { valor: '1', label: t('filtros.hoy') },
    { valor: '7', label: t('filtros.ultimos7') },
    { valor: '30', label: t('filtros.ultimos30') },
  ],
  test: (it, v) => Date.now() - ms(it.createdAt) <= Number(v) * DIA,
});

const edadMeses = (a: { edadAnios: number | null; edadMeses: number | null }): number | null =>
  a.edadAnios === null && a.edadMeses === null ? null : (a.edadAnios ?? 0) * 12 + (a.edadMeses ?? 0);

export function filtrosAdopcion(t: T): FiltrosConfig<Adopcion> {
  return {
    ordenes: [
      ...porFecha<Adopcion>(t),
      {
        valor: 'jovenes',
        label: t('filtros.masJovenes'),
        cmp: (a, b) => (edadMeses(a) ?? 1e9) - (edadMeses(b) ?? 1e9),
      },
      {
        valor: 'grandes',
        label: t('filtros.masGrandes'),
        cmp: (a, b) => (edadMeses(b) ?? -1) - (edadMeses(a) ?? -1),
      },
    ],
    defs: [
      { key: 'sexo', titulo: t('filtros.sexo'), opciones: sexo(t), test: (a, v) => a.sexo === v },
      {
        key: 'edad',
        titulo: t('filtros.edad'),
        opciones: [
          { valor: 'cachorro', label: t('filtros.cachorro') },
          { valor: 'joven', label: t('filtros.joven') },
          { valor: 'adulto', label: t('filtros.adulto') },
          { valor: 'senior', label: t('filtros.senior') },
        ],
        test: (a, v) => {
          const m = edadMeses(a);
          if (m === null) return false;
          if (v === 'cachorro') return m < 12;
          if (v === 'joven') return m >= 12 && m < 36;
          if (v === 'adulto') return m >= 36 && m < 96;
          return m >= 96;
        },
      },
      {
        key: 'estado',
        titulo: t('filtros.estado'),
        opciones: [
          { valor: 'disponible', label: t('filtros.disponible') },
          { valor: 'en_proceso', label: t('filtros.enProceso') },
          { valor: 'adoptado', label: t('filtros.adoptado') },
        ],
        test: (a, v) => a.estadoAdopcion === v,
      },
      { key: 'raza', titulo: t('filtros.raza'), opciones: [{ valor: 'si', label: t('filtros.conRaza') }, { valor: 'no', label: t('filtros.mestizo') }], test: (a, v) => (v === 'si' ? Boolean(a.raza) : !a.raza) },
      { key: 'zona', titulo: t('filtros.zona'), opciones: siNo(t).map((o) => ({ ...o, label: t('filtros.conZona') })), test: (a) => Boolean(a.zonaDescripcion) },
      { key: 'foto', titulo: t('filtros.fotos'), opciones: [{ valor: 'si', label: t('filtros.conFoto') }], test: (a) => conFoto(a.fotos) },
      { key: 'wsp', titulo: t('filtros.contacto'), opciones: [{ valor: 'si', label: t('filtros.conWhatsapp') }], test: (a) => Boolean(a.whatsappNumero) },
      publicadoEn<Adopcion>(t),
      { key: 'fav', titulo: t('filtros.favoritos'), opciones: [{ valor: 'si', label: t('filtros.soloFavoritos') }], test: (a) => a.esFavorito },
    ],
  };
}

export function filtrosPerdidos(t: T): FiltrosConfig<Perdido> {
  return {
    ordenes: [
      { valor: 'suceso', label: t('filtros.masRecientesSuceso'), cmp: (a, b) => ms(b.fechaSuceso) - ms(a.fechaSuceso) },
      ...porFecha<Perdido>(t),
    ],
    defs: [
      { key: 'especie', titulo: t('filtros.especie'), opciones: especies(t), test: (p, v) => p.especie === v },
      { key: 'sexo', titulo: t('filtros.sexo'), opciones: sexo(t), test: (p, v) => p.sexo === v },
      {
        key: 'estado',
        titulo: t('filtros.estado'),
        opciones: [
          { valor: 'activo', label: t('filtros.sigueBuscando') },
          { valor: 'reencontrado', label: t('filtros.reencontrado') },
        ],
        test: (p, v) => p.estadoPerdido === v,
      },
      {
        key: 'suceso',
        titulo: t('filtros.cuandoPaso'),
        opciones: [
          { valor: '1', label: t('filtros.hoy') },
          { valor: '3', label: t('filtros.ultimos3') },
          { valor: '7', label: t('filtros.ultimos7') },
          { valor: '30', label: t('filtros.ultimos30') },
        ],
        test: (p, v) => Date.now() - ms(p.fechaSuceso) <= Number(v) * DIA,
      },
      { key: 'raza', titulo: t('filtros.raza'), opciones: [{ valor: 'si', label: t('filtros.conRaza') }, { valor: 'no', label: t('filtros.mestizo') }], test: (p, v) => (v === 'si' ? Boolean(p.raza || p.razaTexto) : !(p.raza || p.razaTexto)) },
      { key: 'mascota', titulo: t('filtros.registro'), opciones: [{ valor: 'si', label: t('filtros.mascotaRegistrada') }], test: (p) => p.mascotaId !== null },
      { key: 'foto', titulo: t('filtros.fotos'), opciones: [{ valor: 'si', label: t('filtros.conFoto') }], test: (p) => conFoto(p.fotos) },
      { key: 'wsp', titulo: t('filtros.contacto'), opciones: [{ valor: 'si', label: t('filtros.conWhatsapp') }], test: (p) => Boolean(p.whatsappNumero) },
    ],
  };
}

export function filtrosTransito(t: T): FiltrosConfig<Transito> {
  return {
    ordenes: [porDistancia<Transito>(t), ...porFecha<Transito>(t)],
    defs: [
      { key: 'especie', titulo: t('filtros.especie'), opciones: especies(t), test: (x, v) => x.especie === v },
      { key: 'sexo', titulo: t('filtros.sexo'), opciones: sexo(t), test: (x, v) => x.sexo === v },
      {
        key: 'duracion',
        titulo: t('filtros.duracion'),
        opciones: [
          { valor: 'corta', label: t('filtros.hasta15') },
          { valor: 'media', label: t('filtros.de16a60') },
          { valor: 'larga', label: t('filtros.mas60') },
          { valor: 'indef', label: t('filtros.sinDefinir') },
        ],
        test: (x, v) => {
          if (v === 'indef') return x.duracionDias === null;
          if (x.duracionDias === null) return false;
          if (v === 'corta') return x.duracionDias <= 15;
          if (v === 'media') return x.duracionDias > 15 && x.duracionDias <= 60;
          return x.duracionDias > 60;
        },
      },
      {
        key: 'estado',
        titulo: t('filtros.estado'),
        opciones: [
          { valor: 'disponible', label: t('filtros.disponible') },
          { valor: 'acordado', label: t('filtros.acordado') },
        ],
        test: (x, v) => x.estadoTransito === v,
      },
      { key: 'animal', titulo: t('filtros.animal'), opciones: [{ valor: 'si', label: t('filtros.conAnimal') }], test: (x) => Boolean(x.nombre || x.especie) },
      { key: 'foto', titulo: t('filtros.fotos'), opciones: [{ valor: 'si', label: t('filtros.conFoto') }], test: (x) => conFoto(x.fotos) },
      { key: 'wsp', titulo: t('filtros.contacto'), opciones: [{ valor: 'si', label: t('filtros.conWhatsapp') }], test: (x) => Boolean(x.whatsappNumero) },
      publicadoEn<Transito>(t),
    ],
  };
}

export function filtrosDonaciones(t: T): FiltrosConfig<Donacion> {
  return {
    ordenes: [porDistancia<Donacion>(t), ...porFecha<Donacion>(t)],
    defs: [
      {
        key: 'categoria',
        titulo: t('filtros.categoria'),
        opciones: [
          { valor: 'alimento', label: t('filtros.alimento') },
          { valor: 'insumo', label: t('filtros.insumo') },
          { valor: 'ropa', label: t('filtros.ropa') },
        ],
        test: (d, v) => d.categoria === v,
      },
      { key: 'especie', titulo: t('filtros.especie'), opciones: especies(t), test: (d, v) => d.especie === v },
      {
        key: 'estado',
        titulo: t('filtros.estado'),
        opciones: [
          { valor: 'disponible', label: t('filtros.disponible') },
          { valor: 'acordado', label: t('filtros.acordado') },
        ],
        test: (d, v) => d.estadoDonacion === v,
      },
      { key: 'foto', titulo: t('filtros.fotos'), opciones: [{ valor: 'si', label: t('filtros.conFoto') }], test: (d) => conFoto(d.fotos) },
      { key: 'wsp', titulo: t('filtros.contacto'), opciones: [{ valor: 'si', label: t('filtros.conWhatsapp') }], test: (d) => Boolean(d.whatsappNumero) },
      publicadoEn<Donacion>(t),
    ],
  };
}

export function filtrosProductos(t: T): FiltrosConfig<Producto> {
  return {
    ordenes: [
      { valor: 'barato', label: t('filtros.menorPrecio'), cmp: (a, b) => a.precio - b.precio },
      { valor: 'caro', label: t('filtros.mayorPrecio'), cmp: (a, b) => b.precio - a.precio },
      porDistancia<Producto>(t),
      ...porFecha<Producto>(t),
    ],
    defs: [
      {
        key: 'precio',
        titulo: t('filtros.precio'),
        opciones: [
          { valor: 'gratis', label: t('filtros.gratis') },
          { valor: 'p1', label: t('filtros.hasta10k') },
          { valor: 'p2', label: t('filtros.de10a50k') },
          { valor: 'p3', label: t('filtros.mas50k') },
        ],
        test: (p, v) => {
          if (v === 'gratis') return p.precio === 0;
          if (v === 'p1') return p.precio > 0 && p.precio <= 10000;
          if (v === 'p2') return p.precio > 10000 && p.precio <= 50000;
          return p.precio > 50000;
        },
      },
      { key: 'especie', titulo: t('filtros.especie'), opciones: especies(t), test: (p, v) => p.especie === v },
      { key: 'stock', titulo: t('filtros.stock'), opciones: [{ valor: 'si', label: t('filtros.conStock') }], test: (p) => p.cantidad > 0 },
      { key: 'foto', titulo: t('filtros.fotos'), opciones: [{ valor: 'si', label: t('filtros.conFoto') }], test: (p) => conFoto(p.fotos) },
      { key: 'wsp', titulo: t('filtros.contacto'), opciones: [{ valor: 'si', label: t('filtros.conWhatsapp') }], test: (p) => Boolean(p.whatsappNumero) },
      publicadoEn<Producto>(t),
      { key: 'fav', titulo: t('filtros.favoritos'), opciones: [{ valor: 'si', label: t('filtros.soloFavoritos') }], test: (p) => p.esFavorito },
    ],
  };
}

export function filtrosCampanias(t: T): FiltrosConfig<Campania> {
  return {
    ordenes: [
      { valor: 'pronto', label: t('filtros.masProximas'), cmp: (a, b) => ms(a.fechaDesde) - ms(b.fechaDesde) },
      { valor: 'lejos', label: t('filtros.masLejanas'), cmp: (a, b) => ms(b.fechaDesde) - ms(a.fechaDesde) },
    ],
    defs: [
      {
        key: 'cuando',
        titulo: t('filtros.cuando'),
        opciones: [
          { valor: 'proximas', label: t('filtros.proximas') },
          { valor: 'semana', label: t('filtros.estaSemana') },
          { valor: 'mes', label: t('filtros.esteMes') },
          { valor: 'pasadas', label: t('filtros.pasadas') },
        ],
        test: (c, v) => {
          const desde = ms(c.fechaDesde);
          const ahora = Date.now();
          if (v === 'pasadas') return Boolean(c.termino) || ms(c.fechaHasta ?? c.fechaDesde) + DIA < ahora;
          if (c.termino) return false;
          if (v === 'proximas') return desde + DIA >= ahora;
          if (v === 'semana') return desde >= ahora - DIA && desde <= ahora + 7 * DIA;
          return desde >= ahora - DIA && desde <= ahora + 30 * DIA;
        },
      },
      {
        key: 'inscripcion',
        titulo: t('filtros.inscripcion'),
        opciones: [
          { valor: 'requiere', label: t('filtros.requiereInscripcion') },
          { valor: 'libre', label: t('filtros.entradaLibre') },
        ],
        test: (c, v) => (v === 'requiere' ? c.requiereInscripcion : !c.requiereInscripcion),
      },
      {
        key: 'cupo',
        titulo: t('filtros.cupo'),
        opciones: [{ valor: 'si', label: t('filtros.conLugar') }],
        test: (c) => !c.requiereInscripcion || c.cupoDisponible === null || c.cupoDisponible === undefined || c.cupoDisponible > 0,
      },
      { key: 'insc', titulo: t('filtros.miInscripcion'), opciones: [{ valor: 'si', label: t('filtros.estoyInscripto') }], test: (c) => Boolean(c.estoyInscripto) },
      { key: 'equipo', titulo: t('filtros.organiza'), opciones: [{ valor: 'si', label: t('filtros.unEquipo') }, { valor: 'no', label: t('filtros.unaPersona') }], test: (c, v) => (v === 'si' ? Boolean(c.equipo) : !c.equipo) },
    ],
  };
}

export function filtrosVeterinarias(t: T): FiltrosConfig<Veterinaria> {
  return {
    ordenes: [
      porDistancia<Veterinaria>(t),
      { valor: 'az', label: t('filtros.az'), cmp: (a, b) => a.nombre.localeCompare(b.nombre) },
    ],
    defs: [
      { key: 'wsp', titulo: t('filtros.contacto'), opciones: [{ valor: 'wsp', label: t('filtros.conWhatsapp') }, { valor: 'tel', label: t('filtros.conTelefono') }], test: (v, o) => (o === 'wsp' ? Boolean(v.whatsappNumero) : Boolean(v.telefono)) },
      { key: 'horario', titulo: t('filtros.horario'), opciones: [{ valor: 'si', label: t('filtros.conHorario') }], test: (v) => Boolean(v.horario) },
      { key: 'foto', titulo: t('filtros.fotos'), opciones: [{ valor: 'si', label: t('filtros.conFoto') }], test: (v) => conFoto(v.fotos) },
      { key: 'dir', titulo: t('filtros.direccion'), opciones: [{ valor: 'si', label: t('filtros.conDireccion') }], test: (v) => Boolean(v.direccion) },
    ],
  };
}

export function filtrosEquipos(t: T): FiltrosConfig<Equipo> {
  return {
    ordenes: [
      porDistancia<Equipo>(t),
      { valor: 'az', label: t('filtros.az'), cmp: (a, b) => a.nombre.localeCompare(b.nombre) },
    ],
    defs: [
      { key: 'tel', titulo: t('filtros.contacto'), opciones: [{ valor: 'tel', label: t('filtros.conTelefono') }, { valor: 'mail', label: t('filtros.conEmail') }, { valor: 'web', label: t('filtros.conWeb') }], test: (e, v) => (v === 'tel' ? Boolean(e.telefono) : v === 'mail' ? Boolean(e.email) : Boolean(e.sitioWeb)) },
      { key: 'zona', titulo: t('filtros.zona'), opciones: [{ valor: 'si', label: t('filtros.conZona') }], test: (e) => Boolean(e.zonaDescripcion) },
      { key: 'foto', titulo: t('filtros.fotos'), opciones: [{ valor: 'si', label: t('filtros.conLogo') }], test: (e) => Boolean(e.avatarPath) },
    ],
  };
}
