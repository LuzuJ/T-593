export interface Jurisdiccion {
  provincia: string;
  canton: string;
  dignidad: "Alcalde" | "Prefecto";
}

export interface PromesaClasificada {
  promesa: string;
  viable: "Sí" | "Parcial" | "No";
  justificacion: string;
  tipo_competencia: string;
}

export interface AnalisisPlan {
  resumen_abstract: string;
  palabras_clave: string[]; // max 10
  clasificacion_competencia:
    | "Competencia exclusiva municipal"
    | "Competencia concurrente"
    | "Fuera de competencia";
  justificacion_competencia: string;
  paginas_total: number;
  promesas_clasificadas?: PromesaClasificada[];
  temas_disruptivos?: string[];
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
}

export interface Candidato {
  id: string;
  nombre: string;
  partido_politico: string;
  lista: string;
  foto_url?: string;
  fecha_inscripcion?: string;
  jurisdiccion: Jurisdiccion;
  analisis: AnalisisPlan;
  similitudes: SimilitudCandidato[];
}
