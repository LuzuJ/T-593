export interface FilaPlan {
  proceso: number;
  cod_dignidad: number;
  dignidad: string;
  subtipo: string;
  cod_provincia: number;
  provincia: string;
  cod_canton: number;
  canton: string;
  cod_parroquia: number;
  parroquia: string;
  cod_circunscripcion: number;
  circunscripcion: string;
  cod_formulario: number;
  cod_plan: number;
  tiene_plan: boolean;
  url_plan: string;
  archivo: string;
  organizacion: string;
  lista: string;
  candidato: string;
  alterno: string;
  n_principales: number;
  n_suplentes: number;
}

export interface Sugerencia {
  id: string;
  tipo: 'lugar' | 'persona';
  titulo: string;
  detalle: string;
  cod_provincia: number;
  provincia: string;
  cod_canton: number;
  canton: string;
  cod_parroquia: number;
  parroquia: string;
  cod_circunscripcion: number;
  circunscripcion: string;
  subtipo: string;
  cod_formulario?: number;
  total: number;
}

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'para', 'y', 'a', 'un', 'una', 'por']);

let catalogoPromise: Promise<FilaPlan[]> | null = null;

export function norm(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PROVINCIA_ALIAS: Record<string, string> = {
  'sto domingo': 'sto dgo tsachilas',
  'santo domingo': 'sto dgo tsachilas',
  'santo domingo de los tsachilas': 'sto dgo tsachilas',
  'sta elena': 'santa elena',
  'zamora ch': 'zamora chinchipe',
};

const CANTON_ALIAS: Record<string, string> = {
  'rioverde': 'rio verde',
  'alfredo baquerizo moreno': 'a baquerizo moreno',
  'crnel marcelino mariduena': 'crnl marcelino mariduenas',
  'gnral antonio elizalde': 'gral a elizalde',
  'san jacinto de yaguachi': 'yaguachi',
  'san miguel de urcuqui': 'urcuqui',
  'puebloviejo': 'pueblo viejo',
  'carlos julio arosemena tola': 'c j arosemena tola',
  'la joya de los sachas': 'joya de los sachas',
  'banos de agua santa': 'banos',
  'san pedro de pelileo': 'pelileo',
  'santiago de pillaro': 'pillaro',
  'yantzaza': 'yanzatza',
};

function claveProvincia(nombre: string): string {
  const limpio = norm(nombre);
  return PROVINCIA_ALIAS[limpio] || limpio;
}

function claveCanton(nombre: string): string {
  const limpio = norm(nombre);
  return CANTON_ALIAS[limpio] || limpio;
}

const NOMBRES_VACIOS = new Set([
  'candidatos',
  'candidato',
  'concejales',
  'concejal',
  'urbanos',
  'rurales',
  'centro',
  'alianza',
  'plan',
  'trabajo',
  'lista',
]);

function tokensNombre(value: string): string[] {
  return norm(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !NOMBRES_VACIOS.has(token) && !STOP.has(token));
}

function nombresParecidos(a: string, b: string): boolean {
  const izq = norm(a);
  const der = norm(b);
  if (izq.length >= 4 && der.length >= 4 && (izq.includes(der) || der.includes(izq))) return true;
  const ta = tokensNombre(a);
  const tb = new Set(tokensNombre(b));
  return ta.filter((token) => tb.has(token)).length >= 2;
}

export function encontrarPlan(
  filas: FilaPlan[],
  criterio: { nombre: string; lista?: string; canton?: string; provincia?: string; dignidad?: string }
): FilaPlan | null {
  const canton = norm(criterio.canton || '');
  const provincia = criterio.provincia ? claveProvincia(criterio.provincia) : '';
  const dignidad = norm(criterio.dignidad || '');
  const lista = norm(criterio.lista || '');
  const pool = filas.filter((row) => {
    if (!row.cod_plan) return false;
    if (provincia && claveProvincia(row.provincia) !== provincia) return false;
    if (canton && norm(row.canton) && norm(row.canton) !== canton) return false;
    if (dignidad && !norm(row.dignidad).includes(dignidad) && !dignidad.includes(norm(row.dignidad))) return false;
    return true;
  });

  if (lista) {
    const porLista = pool.filter((row) => norm(row.lista) === lista);
    const porNombre = porLista.find((row) => nombresParecidos(row.candidato, criterio.nombre));
    if (porNombre) return porNombre;
    if (porLista.length === 1) return porLista[0];
  }

  return pool.find((row) => nombresParecidos(row.candidato, criterio.nombre)) || null;
}

export function sugerenciaDesdeMapa(filas: FilaPlan[], provincia: string, canton?: string): Sugerencia | null {
  const clave = claveProvincia(provincia);
  const enProvincia = filas.filter((row) => claveProvincia(row.provincia) === clave);
  if (enProvincia.length === 0) return null;

  if (!canton) {
    const prefectos = enProvincia.filter((row) => row.cod_canton === 0);
    const base = prefectos[0] || enProvincia[0];
    return lugarDe(base, 'Prefecto y viceprefecto', prefectos.length || enProvincia.length);
  }

  const buscado = claveCanton(canton);
  const exactos = enProvincia.filter((row) => norm(row.canton) === buscado);
  let usados = exactos.length > 0 ? exactos : enProvincia.filter((row) => norm(row.canton).includes(buscado));
  if (usados.length === 0) {
    // Fallback nacional para cantones reasignados entre provincias (ej. La Concordia)
    usados = filas.filter((row) => norm(row.canton) === buscado);
  }
  if (usados.length === 0) return null;
  const cabecera = usados.find((row) => !row.cod_parroquia) || usados[0];
  return lugarDe(cabecera, 'Alcalde', usados.length);
}

export function titulo(value: string): string {
  return (value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function etiquetaSubtipo(subtipo: string): string {
  switch (subtipo) {
    case 'Alcalde':
      return 'Alcalde';
    case 'Prefecto y viceprefecto':
      return 'Prefecto';
    case 'Concejales urbanos':
      return 'Concejales urbanos';
    case 'Concejales rurales':
      return 'Concejales rurales';
    case 'Concejales urbanos por circunscripcion':
      return 'Circunscripción';
    case 'Vocales de junta parroquial rural':
      return 'Junta parroquial';
    default:
      return subtipo || 'Candidatura';
  }
}

export function cargarCatalogo(): Promise<FilaPlan[]> {
  if (!catalogoPromise) {
    catalogoPromise = fetch('/data/cne/indice_planes_api.jsonl')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el catálogo de planes');
        return res.text();
      })
      .then((text) =>
        text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line) as FilaPlan)
      )
      .catch((error) => {
        catalogoPromise = null;
        throw error;
      });
  }
  return catalogoPromise;
}

function detectarSubtipo(query: string): { subtipo: string; resto: string } {
  const rules: { re: RegExp; subtipo: string }[] = [
    { re: /\bconcejales?\s+rurales?\b/, subtipo: 'Concejales rurales' },
    { re: /\bcircunscripciones?\b/, subtipo: 'Concejales urbanos por circunscripcion' },
    { re: /\bconcejales?\s+urbanos?\b/, subtipo: 'Concejales urbanos' },
    { re: /\bconcejales?\b/, subtipo: 'Concejales urbanos' },
    { re: /\balcaldes?\b|\balcaldias?\b/, subtipo: 'Alcalde' },
    { re: /\bprefectos?\b|\bprefecturas?\b|\bviceprefectos?\b/, subtipo: 'Prefecto y viceprefecto' },
    { re: /\bjuntas?\s+parroquiales?\b|\bvocales?\b|\bparroquiales?\b/, subtipo: 'Vocales de junta parroquial rural' },
  ];
  for (const rule of rules) {
    if (rule.re.test(query)) {
      return { subtipo: rule.subtipo, resto: query.replace(rule.re, ' ').replace(/\s+/g, ' ').trim() };
    }
  }
  return { subtipo: '', resto: query };
}

function tokensDe(texto: string): string[] {
  return norm(texto)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOP.has(token));
}

function scoreLugar(row: FilaPlan, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const canton = norm(row.canton);
  const provincia = norm(row.provincia);
  const parroquia = norm(row.parroquia);
  const campos = [canton, provincia, parroquia, norm(row.circunscripcion)].filter(Boolean);
  if (!tokens.every((token) => campos.some((campo) => campo.includes(token)))) return 0;

  let score = 0;
  for (const token of tokens) {
    if (canton === token) score += row.cod_parroquia ? 40 : 120;
    else if (canton.split(' ').includes(token)) score += 40;
    if (parroquia === token) score += 100;
    else if (parroquia.split(' ').includes(token)) score += 30;
    if (provincia === token && !row.cod_canton) score += 90;
    else if (provincia === token) score += 20;
  }
  return score;
}

function lugarDe(row: FilaPlan, subtipo: string, total: number): Sugerencia {
  const canton = row.canton ? titulo(row.canton) : '';
  const provincia = titulo(row.provincia);
  const parroquia = row.parroquia ? titulo(row.parroquia) : '';
  const tituloLugar = parroquia || canton || provincia;
  const detalleLugar = [parroquia ? canton : '', provincia].filter(Boolean).join(' · ');
  return {
    id: `lugar-${row.cod_provincia}-${row.cod_canton}-${row.cod_parroquia}-${row.cod_circunscripcion}-${subtipo}`,
    tipo: 'lugar',
    titulo: subtipo ? `${etiquetaSubtipo(subtipo)} de ${tituloLugar}` : tituloLugar,
    detalle: `${detalleLugar}${detalleLugar ? ' · ' : ''}${total} listas`,
    cod_provincia: row.cod_provincia,
    provincia: row.provincia,
    cod_canton: row.cod_canton,
    canton: row.canton,
    cod_parroquia: row.cod_parroquia,
    parroquia: row.parroquia,
    cod_circunscripcion: row.cod_circunscripcion,
    circunscripcion: row.circunscripcion,
    subtipo,
    total,
  };
}

export function buscarCatalogo(filas: FilaPlan[], consulta: string): Sugerencia[] {
  const limpia = norm(consulta);
  if (limpia.length < 3) return [];
  const { subtipo, resto } = detectarSubtipo(limpia);
  const tokens = tokensDe(resto || limpia);

  const lugares = new Map<string, { row: FilaPlan; score: number; total: number }>();
  const personas: Sugerencia[] = [];

  for (const row of filas) {
    const score = subtipo === 'Prefecto y viceprefecto' && row.cod_canton ? 0 : scoreLugar(row, tokens);
    if (score >= 70) {
      const key = `${row.cod_provincia}|${row.cod_canton}|${row.cod_parroquia}|${row.cod_circunscripcion}`;
      const prev = lugares.get(key);
      if (!prev) lugares.set(key, { row, score, total: 1 });
      else {
        prev.total += 1;
        if (score > prev.score) prev.score = score;
      }
    }

    if (tokens.length > 0) {
      const nombre = `${norm(row.candidato)} ${norm(row.alterno)}`;
      if (tokens.every((token) => nombre.includes(token))) {
        personas.push({
          id: `persona-${row.cod_formulario}`,
          tipo: 'persona',
          titulo: titulo(row.candidato),
          detalle: `${etiquetaSubtipo(row.subtipo)} · ${titulo(row.canton || row.provincia)} · Lista ${row.lista}`,
          cod_provincia: row.cod_provincia,
          provincia: row.provincia,
          cod_canton: row.cod_canton,
          canton: row.canton,
          cod_parroquia: row.cod_parroquia,
          parroquia: row.parroquia,
          cod_circunscripcion: row.cod_circunscripcion,
          circunscripcion: row.circunscripcion,
          subtipo: row.subtipo,
          cod_formulario: row.cod_formulario,
          total: 1,
        });
      }
    }
  }

  for (const item of lugares.values()) {
    if (!item.row.cod_parroquia && item.row.cod_canton) {
      item.total = filas.filter(
        (row) => row.cod_provincia === item.row.cod_provincia && row.cod_canton === item.row.cod_canton
      ).length;
    }
  }

  const sugerenciasLugar = [...lugares.values()]
    .sort((a, b) => b.score - a.score || b.total - a.total)
    .slice(0, 5)
    .map((item) => lugarDe(item.row, subtipo, item.total));

  if (sugerenciasLugar.length > 0) return [...sugerenciasLugar, ...personas.slice(0, 3)];
  return personas.slice(0, 8);
}

export function filasDelLugar(filas: FilaPlan[], sugerencia: Sugerencia): FilaPlan[] {
  return filas.filter((row) => {
    if (row.cod_provincia !== sugerencia.cod_provincia) return false;
    if (sugerencia.cod_canton && row.cod_canton !== sugerencia.cod_canton) return false;
    if (!sugerencia.cod_canton && sugerencia.cod_parroquia === 0 && row.cod_canton !== 0) return false;
    if (sugerencia.cod_parroquia && row.cod_parroquia !== sugerencia.cod_parroquia) return false;
    if (sugerencia.cod_circunscripcion && row.cod_circunscripcion !== sugerencia.cod_circunscripcion) return false;
    return true;
  });
}

export const ORDEN_SUBTIPO = [
  'Alcalde',
  'Prefecto y viceprefecto',
  'Concejales urbanos',
  'Concejales rurales',
  'Concejales urbanos por circunscripcion',
  'Vocales de junta parroquial rural',
];
