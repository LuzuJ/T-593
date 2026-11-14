import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import reglasCootad from '../data/reglas_cootad.json';
import { slugProvincia } from './catalogoPlanes';
import { buildCnePlanDirectUrl, buildCnePlanProxyUrl, isValidPlanId } from './cnePlanUrl';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export type Viable = 'Sí' | 'Parcial' | 'No';
export type TipoPagina = 'portada' | 'indice' | 'diagnostico' | 'propuestas' | 'otro';

export interface PaginaAuditada {
  pagina: number;
  texto: string;
  tipo: TipoPagina;
  tieneTexto: boolean;
}

export interface PromesaAuditada {
  promesa: string;
  viable: Viable;
  tipo: string;
  justificacion: string;
  articulo: string;
  pagina: number;
  tema: string;
  evidencia: string;
}

export interface ConteosAuditoria {
  dentroCompetencia: number;
  requiereCoordinacion: number;
  otroNivel: number;
  totalOfertas: number;
  lineasDescartadas: number;
}

export interface AuditoriaPlan {
  resumen: string;
  paginas: number;
  paginasConTexto: number;
  paginasProcesadas: number;
  caracteresExtraidos: number;
  promesas: PromesaAuditada[];
  conteos: ConteosAuditoria;
  paginasExtraidas: PaginaAuditada[];
  aviso: string;
  sinTexto: boolean;
}

interface Regla {
  viable: Viable;
  tipo: string;
  articulo: string;
  claves: string[];
}

const FUERA: Regla = reglasCootad.fuera as Regla;
const PARCIAL: Regla = reglasCootad.parcial as Regla;

function resolverDignidad(dignidadRaw: string): string {
  const normDig = norm(dignidadRaw || '');
  if (normDig.includes('prefect')) return 'Prefecto';
  if (normDig.includes('concej')) return 'Concejal';
  if (normDig.includes('junta') || normDig.includes('vocal') || normDig.includes('parroq')) return 'Vocal Junta Parroquial';
  return 'Alcalde';
}

const POR_DIGNIDAD = reglasCootad.por_dignidad as Record<string, Regla>;
const AJENO = reglasCootad.ajeno as Record<string, Regla>;

const TEMA_REGLAS = reglasCootad.temas.map((item) => ({
  tema: item.tema,
  regex: new RegExp(item.patron),
}));

const VERBOS_ACCION =
  /\b(construir|implementar|desarrollar|fortalecer|garantizar|promover|mejorar|rehabilitar|mantener|crear|elaborar|ejecutar|gestionar|impulsar|ampliar|optimizar|regular|fiscalizar|coordinar|recuperar|dotar|modernizar|establecer|fomentar|reducir|incrementar|formular|actualizar|consolidar|capacitar|proteger|instalar|adecuar|brindar|generar)(emos|an|á|a|ar|er|ir)?\b/i;

const SECCION_PROPUESTAS =
  /\b(propuestas?|plan de accion|planes programas y proyectos|objetivos? estrategicos?|lineas? de accion|programas? y proyectos?|metas?|banco de ideas|plan plurianual|ejes? estrategicos?|eje\s+\d+|componentes?|proyectos?|estrategias?|plan de trabajo|lineas? estrategicas?|dimension\s+\w+|competencias?)\b/i;
const SECCION_DIAGNOSTICO =
  /\b(diagnostico|situacion actual|caracterizacion|antecedentes|marco legal|base legal|datos generales|metodologia)\b/i;
const MARCA_INDICE = /\b(indice|contenido|tabla de contenido)\b/i;

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function contiene(texto: string, claves: string[], palabraCompleta = false): string | null {
  const base = norm(texto);
  return (
    claves.find((clave) => {
      const limpia = norm(clave).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const inicio = `(^|[^a-z0-9])${limpia}`;
      const patron = palabraCompleta || limpia.length <= 4 ? `${inicio}([^a-z0-9]|$)` : inicio;
      return new RegExp(patron).test(base);
    }) || null
  );
}

function redactarReservados(linea: string): string {
  return linea.replace(/\b\d{9,10}\b/g, '[dato reservado]');
}

const MENCIONA_COORDINACION = /\b(coordin\w*|convenio\w*|articul\w*|en conjunto)\b/i;

function temaDe(clave: string): string {
  const limpia = norm(clave);
  const match = TEMA_REGLAS.find((item) => item.regex.test(limpia));
  return match ? match.tema : 'Otra oferta';
}

function clasificarOferta(linea: string, dignidadRaw: string, pagina: number): PromesaAuditada | null {
  const dignidad = resolverDignidad(dignidadRaw);
  const fuera = contiene(linea, FUERA.claves, true);
  if (fuera && MENCIONA_COORDINACION.test(norm(linea))) {
    return {
      promesa: redactarReservados(linea),
      viable: 'Parcial',
      tipo: PARCIAL.tipo,
      justificacion: `La frase menciona “${fuera}” junto a una coordinación. No se interpreta como si el cargo asumiera esa materia nacional.`,
      articulo: PARCIAL.articulo,
      pagina,
      tema: temaDe(fuera),
      evidencia: fuera,
    };
  }
  if (fuera) {
    return {
      promesa: redactarReservados(linea),
      viable: 'No',
      tipo: FUERA.tipo,
      justificacion: `La frase menciona “${fuera}”. Esa palabra corresponde a una materia nacional; comprueba la página antes de leerla como una propuesta.`,
      articulo: FUERA.articulo,
      pagina,
      tema: temaDe(fuera),
      evidencia: fuera,
    };
  }

  const propia = POR_DIGNIDAD[dignidad] || POR_DIGNIDAD.Alcalde;
  const clavePropia = contiene(linea, propia.claves);
  if (clavePropia && dignidad !== 'Concejal') {
    return {
      promesa: redactarReservados(linea),
      viable: 'Sí',
      tipo: propia.tipo,
      justificacion: `La frase menciona “${clavePropia}”. Esa palabra aparece entre las materias de este nivel de gobierno.`,
      articulo: propia.articulo,
      pagina,
      tema: temaDe(clavePropia),
      evidencia: clavePropia,
    };
  }

  const ajena = AJENO[dignidad];
  const claveAjena = ajena ? contiene(linea, ajena.claves) : null;
  if (claveAjena && ajena) {
    return {
      promesa: redactarReservados(linea),
      viable: ajena.viable,
      tipo: ajena.tipo,
      justificacion: `La frase menciona “${claveAjena}”. Esa palabra se asocia a otro nivel de gobierno; comprueba el contexto en la página.`,
      articulo: ajena.articulo,
      pagina,
      tema: temaDe(claveAjena),
      evidencia: claveAjena,
    };
  }

  if (clavePropia) {
    return {
      promesa: redactarReservados(linea),
      viable: 'Sí',
      tipo: propia.tipo,
      justificacion: `La frase menciona “${clavePropia}”. Esa palabra aparece entre las materias de este cargo.`,
      articulo: propia.articulo,
      pagina,
      tema: temaDe(clavePropia),
      evidencia: clavePropia,
    };
  }

  const parcial = contiene(linea, PARCIAL.claves, true);
  if (parcial) {
    return {
      promesa: redactarReservados(linea),
      viable: 'Parcial',
      tipo: PARCIAL.tipo,
      justificacion: `La frase menciona “${parcial}”. Esa palabra suele exigir coordinación con otra institución.`,
      articulo: PARCIAL.articulo,
      pagina,
      tema: temaDe(parcial),
      evidencia: parcial,
    };
  }
  return null;
}

function pareceIndice(linea: string): boolean {
  const numeros = linea.match(/\b\d+(?:\.\d+){1,3}\b/g)?.length || 0;
  const puntos = /\.{3,}/.test(linea);
  const paginasAlFinal = /\s\d{1,3}\s*$/.test(linea);
  return numeros >= 2 || puntos || (numeros >= 1 && paginasAlFinal);
}

function pareceMetadato(linea: string): boolean {
  return /cedula|nombres y apellidos|datos del postulante|dignidad a la que|firma|certifico|guia metodologica|elaboracion de planes de trabajo|periodo 2027.?2031/i.test(
    linea
  );
}

function normalizarLineas(texto: string): string[] {
  const crudas = texto
    .split(/\n+/)
    .map((linea) => linea.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const unidas: string[] = [];
  for (const linea of crudas) {
    const anterior = unidas[unidas.length - 1];
    if (
      anterior &&
      anterior.length < 220 &&
      !/[.:;!?]$/.test(anterior) &&
      !/^\d+(?:\.\d+)*[.)]?\s/.test(linea) &&
      !pareceIndice(anterior)
    ) {
      unidas[unidas.length - 1] = `${anterior} ${linea}`.slice(0, 700);
    } else {
      unidas.push(linea);
    }
  }
  return unidas;
}

function detectarTipoPagina(texto: string, pagina: number): TipoPagina {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const lineas = normalizarLineas(texto);
  const lineasIndice = lineas.filter(pareceIndice).length;
  if (MARCA_INDICE.test(limpio.slice(0, 800)) || (lineas.length >= 4 && lineasIndice / lineas.length >= 0.35)) return 'indice';
  if (pagina <= 2 && (limpio.length < 1400 || /plan de trabajo|candidato|candidatura/i.test(limpio.slice(0, 600)))) return 'portada';
  if (SECCION_PROPUESTAS.test(limpio)) return 'propuestas';
  if (SECCION_DIAGNOSTICO.test(limpio)) return 'diagnostico';
  return 'otro';
}

const MIN_LONGITUD_FRASE = 25;
const MAX_LONGITUD_FRASE = 360;
const MAX_POR_TEMA = 3;
const MAX_MUESTRA_TOTAL = 24;

function tieneMateriaConocida(frase: string, dignidad: string): boolean {
  const propia = POR_DIGNIDAD[dignidad] || POR_DIGNIDAD.Alcalde;
  const ajena = AJENO[dignidad];
  return Boolean(
    contiene(frase, FUERA.claves, true) ||
      contiene(frase, propia.claves) ||
      (ajena && contiene(frase, ajena.claves)) ||
      contiene(frase, PARCIAL.claves, true)
  );
}

function extraerOfertas(paginas: PaginaAuditada[], dignidad: string): { promesas: PromesaAuditada[]; descartadas: number } {
  const vistas = new Set<string>();
  const promesas: PromesaAuditada[] = [];
  let descartadas = 0;
  let seccionActiva: TipoPagina = 'otro';
  const dignidadResuelta = resolverDignidad(dignidad);

  for (const pagina of paginas) {
    if (pagina.tipo === 'propuestas' || pagina.tipo === 'diagnostico') seccionActiva = pagina.tipo;
    if (pagina.tipo === 'portada' || pagina.tipo === 'indice') {
      descartadas += normalizarLineas(pagina.texto).length;
      continue;
    }

    for (const linea of normalizarLineas(pagina.texto)) {
      if (SECCION_PROPUESTAS.test(linea) && linea.length < 160) seccionActiva = 'propuestas';
      if (SECCION_DIAGNOSTICO.test(linea) && linea.length < 160) seccionActiva = 'diagnostico';
      const frases = linea
        .split(/(?<=[.!?;])\s+/)
        .map((frase) => frase.trim())
        .filter((frase) => frase.length >= MIN_LONGITUD_FRASE && frase.length <= MAX_LONGITUD_FRASE);
      if (frases.length === 0) {
        descartadas += 1;
        continue;
      }

      for (const frase of frases) {
        const enSeccionPropuestas = seccionActiva === 'propuestas' || pagina.tipo === 'propuestas';
        const tieneAccionOMateriaNominal =
          VERBOS_ACCION.test(frase) || (enSeccionPropuestas && tieneMateriaConocida(frase, dignidadResuelta));
        const esOferta =
          tieneAccionOMateriaNominal &&
          !pareceIndice(frase) &&
          !pareceMetadato(frase) &&
          !/\b(fuente:|se recomienda|recomendacion tecnica|rendicion de cuentas)\b/i.test(frase) &&
          (enSeccionPropuestas || seccionActiva === 'otro' || /\b(proponemos|nos comprometemos|se ejecutara|se implementara|planteamos|garantizaremos|construiremos)\b/i.test(frase));
        if (!esOferta) {
          descartadas += 1;
          continue;
        }

        const auditada = clasificarOferta(frase, dignidad, pagina.pagina);
        if (!auditada) {
          descartadas += 1;
          continue;
        }
        const temas = temasDeFrase(frase, dignidad);
        if (temas.length > 1) {
          auditada.tema = 'Varios temas';
          auditada.justificacion = `${auditada.justificacion} Cruza más de una materia (${temas.join(' y ')}).`;
        }
        const clave = norm(auditada.promesa).replace(/[^a-z0-9 ]/g, '').slice(0, 120);
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        promesas.push(auditada);
      }
    }
  }
  return { promesas: muestraEquilibrada(promesas), descartadas };
}

function temasDeFrase(linea: string, dignidadRaw: string): string[] {
  const dignidad = resolverDignidad(dignidadRaw);
  const temas = new Set<string>();
  const marcar = (claves: string[], completa: boolean) => {
    claves.forEach((clave) => {
      if (contiene(linea, [clave], completa)) temas.add(temaDe(clave));
    });
  };
  marcar(FUERA.claves, true);
  marcar((POR_DIGNIDAD[dignidad] || POR_DIGNIDAD.Alcalde).claves, false);
  if (AJENO[dignidad]) marcar(AJENO[dignidad].claves, false);
  marcar(PARCIAL.claves, true);
  const especificos = [...temas].filter((tema) => tema !== 'Otra oferta');
  return especificos.length > 0 ? especificos : [...temas];
}

function muestraEquilibrada(promesas: PromesaAuditada[]): PromesaAuditada[] {
  const porTema = new Map<string, PromesaAuditada[]>();
  for (const promesa of promesas) {
    const grupo = porTema.get(promesa.tema) || [];
    if (grupo.length < MAX_POR_TEMA) grupo.push(promesa);
    porTema.set(promesa.tema, grupo);
  }
  const grupos = [...porTema.values()];
  const salida: PromesaAuditada[] = [];
  for (let ronda = 0; ronda < MAX_POR_TEMA; ronda += 1) {
    for (const grupo of grupos) {
      if (ronda < grupo.length) {
        salida.push(grupo[ronda]);
        if (salida.length >= MAX_MUESTRA_TOTAL) return salida;
      }
    }
  }
  return salida;
}

function resumenDe(promesas: PromesaAuditada[], paginasConTexto: number, totalPaginas: number): string {
  if (promesas.length === 0) {
    if (paginasConTexto < totalPaginas) {
      return `Este PDF contiene ${paginasConTexto} de ${totalPaginas} páginas con texto digital seleccionable; el resto puede estar escaneado como imagen, por lo que la lectura automática no pudo extraer propuestas de esas páginas. Esto no indica ausencia de propuestas.`;
    }
    return 'El lector automático basado en reglas no aisló frases en el formato esperado dentro del texto extraíble. Esto no indica ausencia de propuestas en el plan.';
  }
  const temas = [...new Set(promesas.map((promesa) => promesa.tema))].slice(0, 4);
  return `Muestra equilibrada de hasta ${MAX_MUESTRA_TOTAL} frases sobre ${temas.join(', ')}. La misma regla se aplica a todas las listas. No es una calificación ni cubre todo el PDF.`;
}

export function auditarPaginas(paginas: PaginaAuditada[], dignidad: string, totalPaginas = paginas.length): AuditoriaPlan {
  const paginasConTexto = paginas.filter((pagina) => pagina.tieneTexto).length;
  const caracteresExtraidos = paginas.reduce((total, pagina) => total + pagina.texto.length, 0);
  const sinTexto = caracteresExtraidos < 40;
  if (sinTexto) {
    return {
      resumen: 'Este PDF está publicado como imagen escaneada y no contiene texto digital seleccionable. Es una limitación técnica del archivo y no indica ausencia de propuestas.',
      paginas: totalPaginas,
      paginasConTexto,
      paginasProcesadas: paginas.length,
      caracteresExtraidos,
      promesas: [],
      conteos: {
        dentroCompetencia: 0,
        requiereCoordinacion: 0,
        otroNivel: 0,
        totalOfertas: 0,
        lineasDescartadas: 0,
      },
      paginasExtraidas: paginas.map((pagina) => ({ ...pagina, texto: '' })),
      aviso: 'No se asignó ninguna calificación. Consulta el PDF oficial directamente con el botón "Ver el plan".',
      sinTexto: true,
    };
  }

  const { promesas, descartadas } = extraerOfertas(paginas, dignidad);
  const conteos: ConteosAuditoria = {
    dentroCompetencia: promesas.filter((item) => item.viable === 'Sí').length,
    requiereCoordinacion: promesas.filter((item) => item.viable === 'Parcial').length,
    otroNivel: promesas.filter((item) => item.viable === 'No').length,
    totalOfertas: promesas.length,
    lineasDescartadas: descartadas,
  };
  const aviso =
    promesas.length === 0
      ? paginasConTexto < totalPaginas
        ? 'Limitación técnica de extracción automática (PDF parcialmente escaneado). No es una calificación; revisa el PDF oficial completo.'
        : 'Extracción automática por reglas fijas. Puede omitir propuestas redactadas en tablas, gráficos o formatos distintos; consulta el PDF oficial.'
      : 'Muestra automática del PDF oficial, con la misma regla para todas las listas. No es un dictamen, un ranking ni una lectura completa.';
  return {
    resumen: resumenDe(promesas, paginasConTexto, totalPaginas),
    paginas: totalPaginas,
    paginasConTexto,
    paginasProcesadas: paginas.length,
    caracteresExtraidos,
    promesas,
    conteos,
    paginasExtraidas: paginas.map((pagina) => ({ ...pagina, texto: '' })),
    aviso,
    sinTexto: false,
  };
}

export async function extraerYAuditarPdf(
  datos: ArrayBuffer | Uint8Array,
  dignidad: string
): Promise<AuditoriaPlan> {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  const pdf = await getDocument({ data: bytes }).promise;
  const paginas: PaginaAuditada[] = [];
  for (let numero = 1; numero <= pdf.numPages; numero += 1) {
    const hoja = await pdf.getPage(numero);
    const contenido = await hoja.getTextContent();
    let texto = '';
    for (const item of contenido.items) {
      if (!('str' in item)) continue;
      texto += item.str;
      texto += 'hasEOL' in item && item.hasEOL ? '\n' : ' ';
    }
    texto = texto.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
    paginas.push({
      pagina: numero,
      texto,
      tipo: detectarTipoPagina(texto, numero),
      tieneTexto: texto.length >= 20,
    });
  }
  return auditarPaginas(paginas, dignidad, pdf.numPages);
}

const cache = new Map<string, Promise<AuditoriaPlan>>();
let descargasActivas = 0;
const colaDescargas: Array<() => void> = [];

let precalculadasPromise: Promise<Record<string, AuditoriaPlan>> | null = null;

const precalculadasProvCache = new Map<string, Promise<Record<string, AuditoriaPlan>>>();

export function cargarPrecalculadas(provincia?: string): Promise<Record<string, AuditoriaPlan>> {
  if (!provincia) return Promise.resolve({});
  const slug = slugProvincia(provincia);
  const existente = precalculadasProvCache.get(slug);
  if (existente) return existente;
  const prom = fetch(`/data/cne/auditorias_provincias/${slug}.json`)
    .then((res) => {
      if (!res.ok) return {};
      return res.json() as Promise<Record<string, AuditoriaPlan>>;
    })
    .catch(() => ({}));
  precalculadasProvCache.set(slug, prom);
  return prom;
}

export function buscarPrecalculada(
  precalculadas: Record<string, AuditoriaPlan>,
  proceso: number,
  codFormulario: number,
  codPlan: number,
  dignidad: string
): AuditoriaPlan | undefined {
  const clave = `${proceso}-${codFormulario}-${codPlan}-${dignidad}`;
  const claveCorta = `${proceso}-${codFormulario}-${codPlan}`;
  return precalculadas[clave] || precalculadas[claveCorta] || precalculadas[String(codFormulario)];
}

function conCupo<T>(tarea: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const correr = () => {
      descargasActivas += 1;
      tarea().then(resolve, reject).finally(() => {
        descargasActivas -= 1;
        colaDescargas.shift()?.();
      });
    };
    if (descargasActivas < 2) correr();
    else colaDescargas.push(correr);
  });
}

async function descargarPdfConFallback(
  proceso: number,
  codFormulario: number,
  codPlan: number
): Promise<ArrayBuffer> {
  const fuentes = [
    buildCnePlanProxyUrl(proceso, codFormulario, codPlan),
    buildCnePlanDirectUrl(proceso, codFormulario, codPlan),
  ].filter((url): url is string => Boolean(url));

  let ultimoError = 'El CNE no entregó este plan.';
  for (const url of fuentes) {
    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) {
        ultimoError = `HTTP ${respuesta.status} al obtener el plan.`;
        continue;
      }
      const tipo = respuesta.headers.get('content-type') || '';
      if (tipo.includes('text/html')) {
        ultimoError = 'La respuesta no es el PDF del plan.';
        continue;
      }
      return await respuesta.arrayBuffer();
    } catch (error) {
      ultimoError = error instanceof Error ? error.message : ultimoError;
    }
  }
  throw new Error(ultimoError);
}

export async function auditarPlanCne(
  codFormulario: number,
  codPlan: number,
  dignidad: string,
  proceso = 140,
  provincia?: string
): Promise<AuditoriaPlan> {
  if (!isValidPlanId(proceso) || !isValidPlanId(codFormulario) || !isValidPlanId(codPlan)) {
    return Promise.reject(new Error('El identificador del plan no es válido.'));
  }
  const clave = `${proceso}-${codFormulario}-${codPlan}-${dignidad}`;
  const guardada = cache.get(clave);
  if (guardada) return guardada;

  // 1. Revisar si ya está precalculado estáticamente (0 ms, 0 peticiones al CNE)
  try {
    const precalculadas = await cargarPrecalculadas(provincia);
    const claveCorta = `${proceso}-${codFormulario}-${codPlan}`;
    const pre = precalculadas[clave] || precalculadas[claveCorta] || precalculadas[String(codFormulario)];
    if (pre) {
      const resProm = Promise.resolve(pre);
      cache.set(clave, resProm);
      return pre;
    }
  } catch {
    // Si no se encuentra el archivo precalculado, continúa con fallback
  }

  // 2. Fallback dinámico bajo demanda
  const tarea = conCupo(async () => {
    const buffer = await descargarPdfConFallback(proceso, codFormulario, codPlan);
    return extraerYAuditarPdf(buffer, dignidad);
  }).catch((error) => {
    cache.delete(clave);
    throw error;
  });
  cache.set(clave, tarea);
  if (cache.size > 24) {
    const primera = cache.keys().next().value;
    if (primera && primera !== clave) cache.delete(primera);
  }
  return tarea;
}
