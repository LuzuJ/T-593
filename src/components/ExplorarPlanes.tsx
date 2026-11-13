import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, GitCompareArrows, Loader2, MapPin, Search, Share2 } from 'lucide-react';
import ComparadorPlanes from './ComparadorPlanes';
import {
  FilaPlan,
  ORDEN_SUBTIPO,
  Sugerencia,
  etiquetaSubtipo,
  filasDelLugar,
  norm,
  titulo,
} from '../utils/catalogoPlanes';
import { AuditoriaPlan, auditarPlanCne } from '../utils/auditarPlan';
import VisorPlan from './VisorPlan';

interface ExplorarPlanesProps {
  filas: FilaPlan[];
  sugerencia: Sugerencia;
  cargando?: boolean;
  onVolver: () => void;
}

type EstadoPlan =
  | { estado: 'idle' }
  | { estado: 'leyendo' }
  | { estado: 'listo'; auditoria: AuditoriaPlan }
  | { estado: 'error'; mensaje: string };

const LIMITE_AUTOMATICO = 12;

function colorViable(viable: string): string {
  if (viable === 'Sí') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  if (viable === 'Parcial') return 'bg-amber-100 text-amber-950 border-amber-300';
  return 'bg-rose-100 text-rose-900 border-rose-300';
}

export default function ExplorarPlanes({ filas, sugerencia, cargando = false, onVolver }: ExplorarPlanesProps) {
  const delLugar = useMemo(() => filasDelLugar(filas, sugerencia), [filas, sugerencia]);

  // Si estamos en un cantón, rescatamos también las prefecturas de la provincia correspondiente
  const filasPrefectura = useMemo(() => {
    if (sugerencia.cod_provincia) {
      return filas.filter(
        (fila) => fila.cod_provincia === sugerencia.cod_provincia && fila.cod_canton === 0
      );
    }
    return [];
  }, [filas, sugerencia.cod_provincia]);

  const subtipos = useMemo(() => {
    const presentes = new Set(delLugar.map((fila) => fila.subtipo));
    if (filasPrefectura.length > 0) {
      presentes.add('Prefecto y viceprefecto');
    }
    return ORDEN_SUBTIPO.filter((subtipo) => presentes.has(subtipo));
  }, [delLugar, filasPrefectura]);

  const [subtipoActivo, setSubtipoActivo] = useState(sugerencia.subtipo || subtipos[0] || '');
  const [estados, setEstados] = useState<Record<number, EstadoPlan>>({});
  const [planAbierto, setPlanAbierto] = useState<{ fila: FilaPlan; pagina?: number } | null>(null);
  const [modo, setModo] = useState<'analisis' | 'comparar'>('analisis');
  const [ladoA, setLadoA] = useState<number | null>(null);
  const [ladoB, setLadoB] = useState<number | null>(null);
  const [filtroLocal, setFiltroLocal] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setSubtipoActivo(sugerencia.subtipo && subtipos.includes(sugerencia.subtipo) ? sugerencia.subtipo : subtipos[0] || '');
    setFiltroLocal('');
  }, [sugerencia, subtipos]);

  const visibles = useMemo(() => {
    const base =
      subtipoActivo === 'Prefecto y viceprefecto' && !delLugar.some((f) => f.subtipo === subtipoActivo)
        ? filasPrefectura
        : delLugar.filter((fila) => fila.subtipo === subtipoActivo);
    const q = norm(filtroLocal);
    if (!q) return base;
    return base.filter((fila) =>
      norm(`${fila.candidato} ${fila.alterno} ${fila.organizacion} ${fila.lista}`).includes(q)
    );
  }, [delLugar, subtipoActivo, filasPrefectura, filtroLocal]);

  useEffect(() => {
    const conPlan = visibles.filter((fila) => fila.tiene_plan && fila.cod_plan > 0);
    setLadoA(conPlan[0]?.cod_formulario ?? null);
    setLadoB(conPlan[1]?.cod_formulario ?? conPlan[0]?.cod_formulario ?? null);
  }, [subtipoActivo, sugerencia.id, visibles]);

  const abrirComparacion = (codigo: number) => {
    const conPlan = visibles.filter((fila) => fila.tiene_plan && fila.cod_plan > 0);
    const otro = conPlan.find((fila) => fila.cod_formulario !== codigo);
    setLadoA(codigo);
    setLadoB(otro?.cod_formulario ?? null);
    setModo('comparar');
  };

  const leer = (fila: FilaPlan) => {
    if (!fila.tiene_plan || !fila.cod_plan) {
      setEstados((prev) => ({
        ...prev,
        [fila.cod_formulario]: { estado: 'error', mensaje: 'Esta lista todavía no tiene PDF en el CNE.' },
      }));
      return;
    }
    setEstados((prev) => ({ ...prev, [fila.cod_formulario]: { estado: 'leyendo' } }));
    auditarPlanCne(fila.cod_formulario, fila.cod_plan, fila.dignidad, fila.proceso, fila.provincia)
      .then((auditoria) => {
        setEstados((prev) => ({ ...prev, [fila.cod_formulario]: { estado: 'listo', auditoria } }));
      })
      .catch((err) => {
        console.warn('Error al auditar plan:', err);
        setEstados((prev) => ({
          ...prev,
          [fila.cod_formulario]: {
            estado: 'error',
            mensaje: 'No se pudo procesar el plan en este momento. Puedes abrir el PDF oficial con el botón.',
          },
        }));
      });
  };

  // Carga secuencial respetuosa para no saturar memoria ni red en dispositivos móviles
  useEffect(() => {
    if (visibles.length === 0) return;
    let activo = true;

    const procesarLigeramente = async () => {
      // Priorizar hasta 3 listas que tengan plan y no hayan sido procesadas
      const pendientes = visibles.filter(
        (fila) => fila.tiene_plan && fila.cod_plan > 0 && !estados[fila.cod_formulario]
      );
      for (const fila of pendientes.slice(0, 3)) {
        if (!activo) break;
        leer(fila);
        // Pausa de 400ms para no bloquear sockets de red móvil
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    };

    procesarLigeramente();

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtipoActivo, sugerencia.id, visibles.length]);

  const lugar = [titulo(sugerencia.parroquia), titulo(sugerencia.canton), titulo(sugerencia.provincia)]
    .filter(Boolean)
    .join(' · ');

  const compartirLugar = async () => {
    const url = window.location.href;
    const tituloCompartir = `${sugerencia.titulo} · Planes CNE 2027`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tituloCompartir, url });
        return;
      } catch {
        // Usuario canceló o navegador no soportó
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // Sin acceso al portapapeles
    }
  };

  return (
    <section className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={onVolver}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al mapa
          </button>
          <button
            type="button"
            onClick={compartirLugar}
            className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4 text-blue-700" />}
            <span>{copiado ? 'Enlace copiado' : 'Compartir'}</span>
          </button>
        </div>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shrink-0">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 mb-1.5">
              Seccionales 2027–2031 · Proceso CNE 140
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{sugerencia.titulo}</h2>
            <p className="text-slate-700 mt-1 font-medium">{lugar}</p>
            <p className="text-sm text-slate-600 mt-2">
              Cada frase sale del PDF oficial y se puede abrir en su página.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => setModo('analisis')}
            className={`flex-1 sm:flex-none min-h-11 px-4 py-2 rounded-full text-sm font-bold border ${
              modo === 'analisis' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Análisis
          </button>
          <button
            type="button"
            onClick={() => setModo('comparar')}
            className={`flex-1 sm:flex-none min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${
              modo === 'comparar' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            <GitCompareArrows className="h-4 w-4" />
            Comparar
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          {subtipos.map((subtipo) => {
            const cantidad =
              subtipo === 'Prefecto y viceprefecto' && !delLugar.some((f) => f.subtipo === subtipo)
                ? filasPrefectura.length
                : delLugar.filter((fila) => fila.subtipo === subtipo).length;
            const activo = subtipo === subtipoActivo;
            return (
              <button
                key={subtipo}
                type="button"
                onClick={() => setSubtipoActivo(subtipo)}
                className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-bold border transition cursor-pointer ${
                  activo
                    ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                }`}
              >
                {etiquetaSubtipo(subtipo)} · {cantidad}
              </button>
            );
          })}
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={filtroLocal}
            onChange={(e) => setFiltroLocal(e.target.value)}
            placeholder="Filtrar por candidato, partido o número de lista..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>
      </div>

      {cargando && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4 flex items-center gap-3 text-sm font-bold text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Cargando candidaturas…</span>
        </div>
      )}

      {visibles.length > LIMITE_AUTOMATICO && (
        <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          Hay {visibles.length} listas en esta dignidad. Abre “Leer análisis” en la que quieras revisar. El plan se descarga solo en ese momento.
        </p>
      )}

      {modo === 'comparar' ? (
        <ComparadorPlanes
          filas={visibles.filter((fila) => fila.tiene_plan && fila.cod_plan > 0)}
          ladoA={ladoA}
          ladoB={ladoB}
          estados={estados}
          onCambiarLado={(lado, codigo) => (lado === 'a' ? setLadoA(codigo) : setLadoB(codigo))}
          onLeer={leer}
          onAbrirPagina={(fila, pagina) => setPlanAbierto({ fila, pagina })}
        />
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {visibles.map((fila) => {
          const estado = estados[fila.cod_formulario] || { estado: 'idle' as const };
          const destacada = sugerencia.cod_formulario === fila.cod_formulario;
          return (
            <article
              key={fila.cod_formulario}
              className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col gap-4 ${
                destacada ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                      Lista {fila.lista} · {etiquetaSubtipo(fila.subtipo)}
                    </p>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        fila.tiene_plan && fila.cod_plan > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {fila.tiene_plan && fila.cod_plan > 0 ? 'Plan disponible' : 'Sin PDF en CNE'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-1.5">{titulo(fila.candidato)}</h3>
                  {fila.alterno && (
                    <p className="text-sm text-slate-600 mt-1">Alterno: {titulo(fila.alterno)}</p>
                  )}
                  <p className="text-sm font-semibold text-slate-700 mt-2">{titulo(fila.organizacion)}</p>
                </div>
                {estado.estado === 'listo' && !estado.auditoria.sinTexto && (
                  <div className="text-right shrink-0 max-w-[140px]">
                    <div className="text-xs font-bold text-slate-600 uppercase">Muestra, no puntaje</div>
                    <div className="text-xs text-slate-600 mt-1">{estado.auditoria.conteos.totalOfertas} frases citadas</div>
                  </div>
                )}
              </div>

              {estado.estado === 'leyendo' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Leyendo el documento oficial completo, página por página…
                </div>
              )}

              {estado.estado === 'error' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
                    {estado.mensaje}
                  </p>
                  <button
                    type="button"
                    onClick={() => leer(fila)}
                    className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Reintentar lectura
                  </button>
                </div>
              )}

              {estado.estado === 'listo' && (() => {
                const aud = estado.auditoria;
                const esTextoAntiguoVacio =
                  aud.promesas.length === 0 &&
                  (aud.sinTexto || aud.resumen.includes('No se encontraron ofertas concretas'));
                const resumenMostrar = esTextoAntiguoVacio
                  ? aud.sinTexto
                    ? 'Este PDF está publicado como imagen escaneada y no contiene texto digital seleccionable. Es una limitación técnica del archivo y no indica ausencia de propuestas.'
                    : aud.paginasConTexto < aud.paginas
                      ? `Este PDF contiene ${aud.paginasConTexto} de ${aud.paginas} páginas con texto digital seleccionable; el resto puede estar escaneado como imagen, por lo que la lectura automática no pudo extraer propuestas de esas páginas. Esto no indica ausencia de propuestas.`
                      : 'El lector automático basado en reglas no aisló frases en el formato esperado dentro del texto extraíble. Esto no indica ausencia de propuestas en el plan.'
                  : aud.resumen;
                const avisoMostrar = esTextoAntiguoVacio
                  ? aud.sinTexto
                    ? 'No se asignó ninguna calificación. Consulta el PDF oficial directamente con el botón "Ver el plan".'
                    : aud.paginasConTexto < aud.paginas
                      ? 'Limitación técnica de extracción automática (PDF parcialmente escaneado). No es una calificación; revisa el PDF oficial completo.'
                      : 'Extracción automática por reglas fijas. Puede omitir propuestas redactadas en tablas, gráficos o formatos distintos; consulta el PDF oficial.'
                  : aud.aviso;
                return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {aud.paginasProcesadas} de {aud.paginas} páginas procesadas
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {aud.conteos.dentroCompetencia} mencionan materia del cargo
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {aud.conteos.requiereCoordinacion} mencionan coordinación
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {aud.conteos.otroNivel} mencionan otro nivel
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{resumenMostrar}</p>
                  <ul className="space-y-2">
                    {aud.promesas.map((promesa) => (
                      <li key={`${promesa.pagina}-${promesa.promesa}`} className="text-sm border border-slate-100 rounded-2xl p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`inline-flex text-[11px] font-black px-2 py-0.5 rounded-full border ${colorViable(promesa.viable)}`}>
                            {promesa.viable === 'Sí' ? 'Palabra del cargo' : promesa.viable === 'Parcial' ? 'Palabra de coordinación' : 'Palabra de otro nivel'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPlanAbierto({ fila, pagina: promesa.pagina })}
                            className="text-xs font-black text-blue-700 hover:text-blue-900"
                          >
                            Ver página {promesa.pagina}
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-2">{promesa.tema} · {promesa.articulo}</p>
                        <p className="text-slate-800 mt-2">{promesa.promesa}</p>
                        <p className="text-slate-500 mt-1">{promesa.justificacion}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{avisoMostrar}</p>
                </div>
                );
              })()}

              <div className="flex flex-wrap gap-2 mt-auto">
                {estado.estado === 'idle' && (
                  <button
                    type="button"
                    onClick={() => leer(fila)}
                    className="min-h-11 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
                  >
                    Leer análisis
                  </button>
                )}
                {fila.tiene_plan && fila.cod_plan > 0 && (
                  <button
                    type="button"
                    onClick={() => setPlanAbierto({ fila })}
                    className="min-h-11 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver el plan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => abrirComparacion(fila.cod_formulario)}
                  className="min-h-11 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <GitCompareArrows className="h-4 w-4" />
                  Comparar
                </button>
              </div>
            </article>
          );
        })}
      </div>
      )}
      {planAbierto && (
        <VisorPlan
          fila={planAbierto.fila}
          paginaInicial={planAbierto.pagina}
          onCerrar={() => setPlanAbierto(null)}
        />
      )}
    </section>
  );
}
