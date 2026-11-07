import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, GitCompareArrows, Loader2, MapPin } from 'lucide-react';
import ComparadorPlanes from './ComparadorPlanes';
import {
  FilaPlan,
  ORDEN_SUBTIPO,
  Sugerencia,
  etiquetaSubtipo,
  filasDelLugar,
  titulo,
} from '../utils/catalogoPlanes';
import { AuditoriaPlan, auditarPlanCne } from '../utils/auditarPlan';
import VisorPlan from './VisorPlan';

interface ExplorarPlanesProps {
  filas: FilaPlan[];
  sugerencia: Sugerencia;
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

export default function ExplorarPlanes({ filas, sugerencia, onVolver }: ExplorarPlanesProps) {
  const delLugar = useMemo(() => filasDelLugar(filas, sugerencia), [filas, sugerencia]);
  const subtipos = useMemo(() => {
    const presentes = new Set(delLugar.map((fila) => fila.subtipo));
    return ORDEN_SUBTIPO.filter((subtipo) => presentes.has(subtipo));
  }, [delLugar]);

  const [subtipoActivo, setSubtipoActivo] = useState(sugerencia.subtipo || subtipos[0] || '');
  const [estados, setEstados] = useState<Record<number, EstadoPlan>>({});
  const [planAbierto, setPlanAbierto] = useState<{ fila: FilaPlan; pagina?: number } | null>(null);
  const [modo, setModo] = useState<'analisis' | 'comparar'>('analisis');
  const [ladoA, setLadoA] = useState<number | null>(null);
  const [ladoB, setLadoB] = useState<number | null>(null);

  useEffect(() => {
    setSubtipoActivo(sugerencia.subtipo && subtipos.includes(sugerencia.subtipo) ? sugerencia.subtipo : subtipos[0] || '');
  }, [sugerencia, subtipos]);

  const visibles = useMemo(
    () => delLugar.filter((fila) => fila.subtipo === subtipoActivo),
    [delLugar, subtipoActivo]
  );

  useEffect(() => {
    const conPlan = visibles.filter((fila) => fila.tiene_plan && fila.cod_plan > 0);
    setLadoA(conPlan[0]?.cod_formulario ?? null);
    setLadoB(conPlan[1]?.cod_formulario ?? conPlan[0]?.cod_formulario ?? null);
  }, [subtipoActivo, sugerencia.id]);

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
    auditarPlanCne(fila.cod_formulario, fila.cod_plan, fila.dignidad, fila.proceso)
      .then((auditoria) => {
        setEstados((prev) => ({ ...prev, [fila.cod_formulario]: { estado: 'listo', auditoria } }));
      })
      .catch(() => {
        setEstados((prev) => ({
          ...prev,
          [fila.cod_formulario]: { estado: 'error', mensaje: 'No se pudo leer el plan. Puedes abrir el PDF oficial.' },
        }));
      });
  };

  useEffect(() => {
    if (visibles.length === 0 || visibles.length > LIMITE_AUTOMATICO) return;
    const pendientes = visibles.filter((fila) => fila.tiene_plan && !estados[fila.cod_formulario]);
    pendientes.forEach((fila) => leer(fila));
    // La lectura se dispara al cambiar de pestaña, no en cada actualización del estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtipoActivo, sugerencia.id, visibles.length]);

  const lugar = [titulo(sugerencia.parroquia), titulo(sugerencia.canton), titulo(sugerencia.provincia)]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 shadow-sm">
        <button
          type="button"
          onClick={onVolver}
          className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al mapa
        </button>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{sugerencia.titulo}</h2>
            <p className="text-slate-600 mt-1">{lugar}</p>
            <p className="text-sm text-slate-500 mt-2">
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
            const cantidad = delLugar.filter((fila) => fila.subtipo === subtipo).length;
            const activo = subtipo === subtipoActivo;
            return (
              <button
                key={subtipo}
                type="button"
                onClick={() => setSubtipoActivo(subtipo)}
                className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-bold border transition ${
                  activo
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                }`}
              >
                {etiquetaSubtipo(subtipo)} · {cantidad}
              </button>
            );
          })}
        </div>
      </div>

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
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Lista {fila.lista} · {etiquetaSubtipo(fila.subtipo)}
                  </p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{titulo(fila.candidato)}</h3>
                  {fila.alterno && (
                    <p className="text-sm text-slate-500 mt-1">Alterno: {titulo(fila.alterno)}</p>
                  )}
                  <p className="text-sm font-semibold text-slate-700 mt-2">{titulo(fila.organizacion)}</p>
                </div>
                {estado.estado === 'listo' && !estado.auditoria.sinTexto && (
                  <div className="text-right shrink-0 max-w-[140px]">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Muestra, no puntaje</div>
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
                <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">{estado.mensaje}</p>
              )}

              {estado.estado === 'listo' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {estado.auditoria.paginasProcesadas} de {estado.auditoria.paginas} páginas procesadas
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {estado.auditoria.conteos.dentroCompetencia} mencionan materia del cargo
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {estado.auditoria.conteos.requiereCoordinacion} mencionan coordinación
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {estado.auditoria.conteos.otroNivel} mencionan otro nivel
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{estado.auditoria.resumen}</p>
                  <ul className="space-y-2">
                    {estado.auditoria.promesas.map((promesa) => (
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
                  <p className="text-[11px] text-slate-400">{estado.auditoria.aviso}</p>
                </div>
              )}

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
