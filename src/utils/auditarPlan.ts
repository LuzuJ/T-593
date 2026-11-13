import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { slugProvincia } from './catalogoPlanes';
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

const FUERA: Regla = {
  viable: 'No',
  tipo: 'Corresponde al Estado central',
  articulo: 'Constitución Art. 261',
  claves: [
    'policia nacional',
    'fuerzas armadas',
    'comando policial',
    'iva',
    'impuesto a la renta',
    'politica monetaria',
    'banco central',
    'hospital de especialidad',
    'aduana',
    'relaciones exteriores',
  ],
};

const PARCIAL: Regla = {
  viable: 'Parcial',
  tipo: 'Requiere coordinación o convenio',
  articulo: 'COOTAD, coordinación interinstitucional',
  claves: [
    'salud',
    'educacion',
    'seguridad ciudadana',
    'videovigilancia',
    'camara de vigilancia',
    'turismo',
    'cultura',
    'deporte',
    'ministerio',
    'universidad',
  ],
};

function resolverDignidad(dignidadRaw: string): string {
  const normDig = norm(dignidadRaw || '');
  if (normDig.includes('prefect')) return 'Prefecto';
  if (normDig.includes('concej')) return 'Concejal';
  if (normDig.includes('junta') || normDig.includes('vocal') || normDig.includes('parroq')) return 'Vocal Junta Parroquial';
  return 'Alcalde';
}

const POR_DIGNIDAD: Record<string, Regla> = {
  Prefecto: {
    viable: 'Sí',
    tipo: 'Competencia provincial',
    articulo: 'COOTAD Art. 42 / CRE Art. 263',
    claves: [
      'vialidad rural',
      'vial rural',
      'camino vecinal',
      'caminos vecinales',
      'red vial provincial',
      'mantenimiento vial',
      'asfaltado rural',
      'asfalto rural',
      'lastrado',
      'puente',
      'puentes',
      'carretera rural',
      'conectividad rural',
      'riego',
      'drenaje',
      'represa',
      'canal de riego',
      'canales de riego',
      'cuenca hidrografica',
      'microcuenca',
      'cuenca',
      'recurso hidrico',
      'fuentes de agua',
      'paramo',
      'paramos',
      'fomento productivo',
      'agropecuar',
      'productiv',
      'agricultura',
      'ganaderia',
      'cadena de valor',
      'soberania alimentaria',
      'agroecol',
      'semillas',
      'asistencia tecnica',
      'emprendimiento rural',
      'gestion ambiental',
      'medio ambiente',
      'reforest',
      'conservacion',
      'area protegida',
      'turismo rural',
      'turismo comunitario',
      'turismo provincial',
      'desarrollo rural',
      'infraestructura rural',
      'ordenamiento territorial provincial',
    ],
  },
  Alcalde: {
    viable: 'Sí',
    tipo: 'Competencia municipal',
    articulo: 'COOTAD Art. 55',
    claves: [
      'agua potable',
      'alcantarillado',
      'saneamiento',
      'desecho',
      'residuo',
      'transito',
      'transporte publico',
      'movilidad urbana',
      'uso de suelo',
      'ocupacion del suelo',
      'catastro',
      'mercado',
      'camal',
      'faenamiento',
      'cementerio',
      'paviment',
      'asfalt',
      'vialidad urbana',
      'ordenamiento territorial',
      'espacio publico',
    ],
  },
  Concejal: {
    viable: 'Sí',
    tipo: 'Atribución del concejo municipal',
    articulo: 'COOTAD Art. 57',
    claves: ['ordenanza', 'fiscaliz', 'concejo', 'legisl', 'reglamento', 'control politico'],
  },
  'Vocal Junta Parroquial': {
    viable: 'Sí',
    tipo: 'Competencia parroquial',
    articulo: 'COOTAD Art. 65',
    claves: [
      'parroquial',
      'comunitari',
      'camino vecinal',
      'agua comunitaria',
      'infraestructura comunitaria',
      'junta parroquial',
      'organizacion territorial',
    ],
  },
};

const AJENO: Record<string, Regla> = {
  Prefecto: {
    viable: 'No',
    tipo: 'Corresponde al municipio',
    articulo: 'COOTAD Art. 55',
    claves: ['agua potable domiciliaria', 'alcantarillado urbano', 'catastro urbano', 'transito cantonal', 'cementerio cantonal', 'mercado municipal'],
  },
  Alcalde: {
    viable: 'No',
    tipo: 'Corresponde a la prefectura',
    articulo: 'COOTAD Art. 42',
    claves: ['vialidad rural provincial', 'riego provincial', 'sistema provincial de riego'],
  },
  Concejal: {
    viable: 'Parcial',
    tipo: 'La ejecución corresponde a la alcaldía',
    articulo: 'COOTAD Arts. 57 y 60',
    claves: ['construir', 'asfaltar', 'alcantarillado', 'agua potable', 'pavimentar'],
  },
};

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
  if (/agua|alcantarill|saneamiento/.test(limpia)) return 'Agua y saneamiento';
  if (/vial|camino|asfalt|paviment/.test(limpia)) return 'Vialidad';
  if (/transito|transporte|movilidad/.test(limpia)) return 'Movilidad';
  if (/mercado|camal|faenamiento/.test(limpia)) return 'Mercados y faenamiento';
  if (/suelo|catastro|ordenamiento/.test(limpia)) return 'Territorio y suelo';
  if (/riego|drenaje|cuenca/.test(limpia)) return 'Riego y cuencas';
  if (/product|agropec|fomento/.test(limpia)) return 'Producción';
  if (/ambiente|reforest|paramo|residuo|desecho/.test(limpia)) return 'Ambiente';
  if (/ordenanza|legisl|reglamento/.test(limpia)) return 'Normativa';
  if (/fiscal|control politico/.test(limpia)) return 'Fiscalización';
  if (/salud/.test(limpia)) return 'Salud';
  if (/educacion/.test(limpia)) return 'Educación';
  if (/seguridad|policia/.test(limpia)) return 'Seguridad';
  return 'Otra oferta';
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

function extraerOfertas(paginas: PaginaAuditada[], dignidad: string): { promesas: PromesaAuditada[]; descartadas: number } {
  const vistas = new Set<string>();
  const promesas: PromesaAuditada[] = [];
  let descartadas = 0;
  let seccionActiva: TipoPagina = 'otro';

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
        .filter((frase) => frase.length >= 45 && frase.length <= 320);
      if (frases.length === 0) {
        descartadas += 1;
        continue;
      }

      for (const frase of frases) {
      const esOferta =
        VERBOS_ACCION.test(frase) &&
        !pareceIndice(frase) &&
        !pareceMetadato(frase) &&
        !/\b(fuente:|se recomienda|recomendacion tecnica|rendicion de cuentas)\b/i.test(frase) &&
        (seccionActiva === 'propuestas' || pagina.tipo === 'propuestas' || seccionActiva === 'otro' || /\b(proponemos|nos comprometemos|se ejecutara|se implementara|planteamos|garantizaremos|construiremos)\b/i.test(frase));
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
        auditada.articulo = 'Frase con más de una materia';
        auditada.justificacion = `La frase menciona ${temas.join(' y ')}. No se guarda bajo un solo tema.`;
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
    if (grupo.length < 3) grupo.push(promesa);
    porTema.set(promesa.tema, grupo);
  }
  const salida: PromesaAuditada[] = [];
  for (const grupo of porTema.values()) {
    for (const promesa of grupo) {
      if (salida.length >= 12) return salida;
      salida.push(promesa);
    }
  }
  return salida;
}

function resumenDe(promesas: PromesaAuditada[]): string {
  if (promesas.length === 0) {
    return 'No se encontraron ofertas concretas con verbo de acción y competencia identificable en el texto extraíble.';
  }
  const temas = [...new Set(promesas.map((promesa) => promesa.tema))].slice(0, 4);
  return `Muestra de hasta 12 frases sobre ${temas.join(', ')}. La misma regla se aplica a todas las listas. No es una calificación ni cubre todo el PDF.`;
}

export function auditarPaginas(paginas: PaginaAuditada[], dignidad: string, totalPaginas = paginas.length): AuditoriaPlan {
  const paginasConTexto = paginas.filter((pagina) => pagina.tieneTexto).length;
  const caracteresExtraidos = paginas.reduce((total, pagina) => total + pagina.texto.length, 0);
  const sinTexto = caracteresExtraidos < 40;
  if (sinTexto) {
    return {
      resumen: 'Este PDF no contiene texto extraíble. Puede ser un documento escaneado.',
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
      aviso: 'No se asignó ninguna calificación. Abre el PDF oficial para revisarlo.',
      sinTexto: true,
    };
  }

  const { promesas, descartadas } = extraerOfertas(paginas, dignidad);
  const conteos: ConteosAuditoria = {
    dentroCompetencia: promesas.filter((item) => item.viable === 'Sí' && item.tema !== 'Varios temas').length,
    requiereCoordinacion: promesas.filter((item) => item.viable === 'Parcial' && item.tema !== 'Varios temas').length,
    otroNivel: promesas.filter((item) => item.viable === 'No' && item.tema !== 'Varios temas').length,
    totalOfertas: promesas.length,
    lineasDescartadas: descartadas,
  };
  return {
    resumen: resumenDe(promesas),
    paginas: totalPaginas,
    paginasConTexto,
    paginasProcesadas: paginas.length,
    caracteresExtraidos,
    promesas,
    conteos,
    paginasExtraidas: paginas.map((pagina) => ({ ...pagina, texto: '' })),
    aviso: 'Muestra automática del PDF oficial, con la misma regla para todas las listas. No es un dictamen, un ranking ni una lectura completa.',
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

function cargarPrecalculadas(provincia?: string): Promise<Record<string, AuditoriaPlan>> {
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

function idSeguro(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0 && valor < 1_000_000;
}

export async function auditarPlanCne(
  codFormulario: number,
  codPlan: number,
  dignidad: string,
  proceso = 140,
  provincia?: string
): Promise<AuditoriaPlan> {
  if (!idSeguro(proceso) || !idSeguro(codFormulario) || !idSeguro(codPlan)) {
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
    const respuesta = await fetch(`/cne-plan/${proceso}/${codFormulario}/${codPlan}`);
    if (!respuesta.ok) throw new Error('El CNE no entregó este plan.');
    const tipo = respuesta.headers.get('content-type') || '';
    if (tipo.includes('text/html')) throw new Error('La respuesta no es el PDF del plan.');
    return extraerYAuditarPdf(await respuesta.arrayBuffer(), dignidad);
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
