import { useState, useMemo, useEffect } from "react";
import { Candidato } from "../types/electoral";

export interface FiltrosElectoral {
  provincia: string;
  canton: string;
  dignidad: string;
  busqueda: string;
}

export interface EstadisticasElectoral {
  total: number;
  conteoPorCanton: Record<string, number>;
  distribucionCompetencias: {
    "Competencia exclusiva municipal": number;
    "Parcialmente viable": number;
    "Competencia concurrente"?: number;
    "Fuera de competencia": number;
  };
}

export const useElectoralData = (candidatos: Candidato[]) => {
  const [provincia, setProvincia] = useState<string>("TODAS");
  const [canton, setCanton] = useState<string>("TODOS");
  const [dignidad, setDignidad] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Resetear el cantón al cambiar la provincia para evitar filtros inconsistentes
  useEffect(() => {
    setCanton("TODOS");
  }, [provincia]);

  const normStr = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const candidatosFiltrados = useMemo(() => {
    return candidatos.filter((c) => {
      // Filtro de provincia
      if (
        provincia !== "TODAS" &&
        normStr(c.jurisdiccion.provincia) !== normStr(provincia)
      ) {
        return false;
      }
      // Filtro de cantón
      if (
        canton !== "TODOS" &&
        normStr(c.jurisdiccion.canton) !== normStr(canton)
      ) {
        return false;
      }
      // Filtro de dignidad
      if (
        dignidad !== "TODAS" &&
        normStr(c.jurisdiccion.dignidad) !== normStr(dignidad)
      ) {
        return false;
      }
      // Filtro por búsqueda de texto libre (nombre, partido o palabras clave)
      if (busqueda.trim() !== "") {
        const query = normStr(busqueda);
        const matchesNombre = normStr(c.nombre).includes(query);
        const matchesPartido = normStr(c.partido_politico).includes(query);
        const matchesPalabrasClave = c.analisis.palabras_clave.some((p) =>
          normStr(p).includes(query),
        );
        if (!matchesNombre && !matchesPartido && !matchesPalabrasClave) {
          return false;
        }
      }
      return true;
    });
  }, [candidatos, provincia, canton, dignidad, busqueda]);

  const estadisticas = useMemo<EstadisticasElectoral>(() => {
    const conteoPorCanton: Record<string, number> = {};
    const distribucionCompetencias = {
      "Competencia exclusiva municipal": 0,
      "Parcialmente viable": 0,
      "Fuera de competencia": 0,
    };

    candidatosFiltrados.forEach((c) => {
      // Conteo por cantón
      const cant = c.jurisdiccion.canton;
      conteoPorCanton[cant] = (conteoPorCanton[cant] || 0) + 1;

      // Distribución de competencias
      const comp = c.analisis.clasificacion_competencia;
      if (comp === "Competencia exclusiva municipal") {
        distribucionCompetencias["Competencia exclusiva municipal"]++;
      } else if (comp === "Competencia concurrente" || comp === "Parcialmente viable") {
        distribucionCompetencias["Parcialmente viable"]++;
      } else if (comp === "Fuera de competencia") {
        distribucionCompetencias["Fuera de competencia"]++;
      }
    });

    return {
      total: candidatosFiltrados.length,
      conteoPorCanton,
      distribucionCompetencias,
    };
  }, [candidatosFiltrados]);

  return {
    candidatosFiltrados,
    estadisticas,
    filtros: {
      provincia,
      canton,
      dignidad,
      busqueda,
      setProvincia,
      setCanton,
      setDignidad,
      setBusqueda,
    },
  };
};
