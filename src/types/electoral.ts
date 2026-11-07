export interface Jurisdiccion {
  provincia: string;
  canton: string;
  parroquia?: string;
  dignidad: "Alcalde" | "Prefecto" | "Concejal" | "Vocal Junta Parroquial" | "No determinado" | string;
}

export interface PromesaClasificada {
  promesa: string;
  viable: "Sí" | "Parcial" | "No" | string;
  justificacion: string;
  tipo_competencia: string;
  articulo_cootad?: string;
  pagina_origen?: number;
}

export interface PaginaDocumento {
  pagina: number;
  texto: string;
  seccion_detectada?: string;
  numero?: number;
  seccion?: string;
}

export interface MetricasCompetencia {
  indice_alineacion_cootad: number; // 0 a 100 calculado objetivamente
  total_propuestas: number;
  propuestas_exclusivas?: number;
  propuestas_concurrentes?: number;
  propuestas_fuera_competencia?: number;
  porcentaje_exclusivas?: number;
  porcentaje_concurrentes?: number;
  porcentaje_fuera?: number;
  exclusivas_si?: number;
  concurrentes_parcial?: number;
  fuera_competencia_no?: number;
  porcentaje_exclusiva?: number;
  porcentaje_concurrente?: number;
  base_legal_aplicada: string;
  metodo_extraccion: string;
  observacion_tecnica?: string;
}

export interface AnalisisPlan {
  resumen_abstract: string;
  palabras_clave: string[]; // max 10
  clasificacion_competencia:
    | "Competencia exclusiva municipal"
    | "Competencia exclusiva"
    | "Alta alineación COOTAD"
    | "Parcialmente viable"
    | "Competencia concurrente"
    | "Alineación parcial COOTAD"
    | "Fuera de competencia"
    | "Baja alineación COOTAD"
    | string;
  justificacion_competencia: string;
  paginas_total: number;
  caracteres_extraidos?: number;
  caracteres_totales?: number;
  paginas_con_texto?: number;
  promesas_clasificadas?: PromesaClasificada[];
  temas_disruptivos?: string[];
  propuestas_no_repetidas?: string[];
  metricas_competencia?: MetricasCompetencia;
  metricas_neutrales?: MetricasCompetencia;
  paginas_documento?: PaginaDocumento[];
  sha256_hash?: string;
}

export interface SimilitudDetalle {
  candidato_id: string;
  puntos_coincidencia: string[];
  puntos_diferencia: string[];
}

export interface SimilitudCandidato {
  candidato_id: string;
  nombre: string;
  porcentaje: number; // 0 a 100
  puntos_coincidencia?: string[];
  puntos_diferencia?: string[];
  jurisdiccion_comparada?: string;
  alerta_plantilla_compartida?: boolean;
}

export interface IntegranteLista {
  principal: string;
  alterno?: string;
  subtipo?: string;
}

export interface Candidato {
  id: string;
  nombre: string;
  alterno?: string;
  partido_politico: string;
  siglas?: string;
  lista: string;
  codigo_org?: string;
  subtipo_dignidad?: string;
  integrantes_lista?: IntegranteLista[];
  foto_url?: string;
  archivo_pdf?: string;
  pdf_url?: string | null;
  fecha_inscripcion?: string;
  jurisdiccion: Jurisdiccion;
  analisis: AnalisisPlan;
  similitudes: SimilitudCandidato[];
  paginas_documento?: PaginaDocumento[];
  sha256_hash?: string;
  _normProv?: string;
  _normCant?: string;
  _normDign?: string;
  _searchIdx?: string;
}
