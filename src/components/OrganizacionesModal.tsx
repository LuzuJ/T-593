import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Building2, ChevronRight, Loader2, Search, X } from 'lucide-react';
import {
  FilaPlan,
  Sugerencia,
  cargarCatalogo,
  etiquetaSubtipo,
  norm,
  titulo,
} from '../utils/catalogoPlanes';

export interface ResumenOrganizacion {
  organizacion: string;
  lista: string;
  total: number;
  prefecto: number;
  alcalde: number;
  concejal: number;
  junta_parroquial: number;
  con_plan: number;
  provincias: number;
}

type FiltroDignidad = 'todas' | 'alcalde' | 'prefecto' | 'concejal' | 'junta_parroquial';

interface OrganizacionesModalProps {
  open: boolean;
  onClose: () => void;
  onSelectSugerencia?: (item: Sugerencia) => void;
}

let resumenPromise: Promise<ResumenOrganizacion[]> | null = null;

function cargarResumenOrganizaciones(): Promise<ResumenOrganizacion[]> {
  if (!resumenPromise) {
    resumenPromise = fetch('/data/cne/resumen_organizaciones.json')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el resumen de organizaciones');
        return res.json() as Promise<ResumenOrganizacion[]>;
      })
      .catch((err) => {
        resumenPromise = null;
        throw err;
      });
  }
  return resumenPromise;
}

function categoriaDeFila(fila: FilaPlan): Exclude<FiltroDignidad, 'todas'> {
  const sub = norm(fila.subtipo || fila.dignidad || '');
  if (sub.includes('prefect')) return 'prefecto';
  if (sub.includes('alcald')) return 'alcalde';
  if (sub.includes('concejal') || sub.includes('circunscripcion')) return 'concejal';
  return 'junta_parroquial';
}

export default function OrganizacionesModal({
  open,
  onClose,
  onSelectSugerencia,
}: OrganizacionesModalProps) {
  const [datos, setDatos] = useState<ResumenOrganizacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [consulta, setConsulta] = useState('');
  const [filtroDignidad, setFiltroDignidad] = useState<FiltroDignidad>('todas');

  const [seleccionada, setSeleccionada] = useState<ResumenOrganizacion | null>(null);
  const [candidatosOrg, setCandidatosOrg] = useState<FilaPlan[]>([]);
  const [cargandoCand, setCargandoCand] = useState(false);
  const [filtroCandDignidad, setFiltroCandDignidad] = useState<FiltroDignidad>('todas');
  const [filtroCandTexto, setFiltroCandTexto] = useState('');

  useEffect(() => {
    if (!open || datos.length > 0) return;
    setCargando(true);
    setError('');
    cargarResumenOrganizaciones()
      .then(setDatos)
      .catch(() => setError('No se pudo cargar el directorio de organizaciones políticas.'))
      .finally(() => setCargando(false));
  }, [open, datos.length]);

  const abrirOrganizacion = (org: ResumenOrganizacion) => {
    setSeleccionada(org);
    setFiltroCandDignidad('todas');
    setFiltroCandTexto('');
    setCargandoCand(true);
    cargarCatalogo()
      .then((rows) => {
        const listaNorm = String(org.lista || '').trim();
        const orgNorm = norm(org.organizacion);
        const filtrados = rows.filter(
          (r) =>
            norm(r.organizacion) === orgNorm &&
            String(r.lista || '').trim() === listaNorm
        );
        filtrados.sort((a, b) =>
          `${a.provincia} ${a.canton} ${a.candidato}`.localeCompare(
            `${b.provincia} ${b.canton} ${b.candidato}`,
            'es'
          )
        );
        setCandidatosOrg(filtrados);
      })
      .catch(() => setCandidatosOrg([]))
      .finally(() => setCargandoCand(false));
  };

  const filtradas = useMemo(() => {
    const q = norm(consulta);
    return datos.filter((item) => {
      if (filtroDignidad !== 'todas' && item[filtroDignidad] === 0) return false;
      if (!q) return true;
      return norm(item.organizacion).includes(q) || norm(item.lista).includes(q);
    });
  }, [datos, consulta, filtroDignidad]);

  const candidatosVisibles = useMemo(() => {
    const q = norm(filtroCandTexto);
    return candidatosOrg.filter((fila) => {
      if (filtroCandDignidad !== 'todas' && categoriaDeFila(fila) !== filtroCandDignidad) {
        return false;
      }
      if (!q) return true;
      return norm(`${fila.candidato} ${fila.alterno} ${fila.provincia} ${fila.canton} ${fila.parroquia}`).includes(q);
    });
  }, [candidatosOrg, filtroCandDignidad, filtroCandTexto]);

  const irACandidatura = (fila: FilaPlan) => {
    if (!onSelectSugerencia) return;
    onSelectSugerencia({
      id: `persona-${fila.cod_formulario}`,
      tipo: 'persona',
      titulo: titulo(fila.candidato),
      detalle: `${etiquetaSubtipo(fila.subtipo)} · ${titulo(fila.canton || fila.provincia)} · Lista ${fila.lista}`,
      cod_provincia: fila.cod_provincia,
      provincia: fila.provincia,
      cod_canton: fila.cod_canton,
      canton: fila.canton,
      cod_parroquia: fila.cod_parroquia,
      parroquia: fila.parroquia,
      cod_circunscripcion: fila.cod_circunscripcion,
      circunscripcion: fila.circunscripcion,
      subtipo: fila.subtipo,
      cod_formulario: fila.cod_formulario,
      total: 1,
    });
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  const botonesFiltro: { id: FiltroDignidad; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'alcalde', label: 'Alcaldías' },
    { id: 'prefecto', label: 'Prefecturas' },
    { id: 'concejal', label: 'Concejalías' },
    { id: 'junta_parroquial', label: 'J. Parroquiales' },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {seleccionada ? (
              <button
                type="button"
                onClick={() => setSeleccionada(null)}
                className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer transition"
                aria-label="Volver a organizaciones"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-black text-slate-900 truncate">
                {seleccionada ? titulo(seleccionada.organizacion) : 'Partidos, Movimientos y Alianzas'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {seleccionada
                  ? `Lista ${seleccionada.lista || 'S/N'} · ${seleccionada.total} candidaturas inscritas`
                  : 'Orden alfabético neutral · Seccionales 2027–2031 (CNE 140)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!seleccionada ? (
          <>
            <div className="p-4 sm:px-6 border-b border-slate-100 shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={consulta}
                  onChange={(e) => setConsulta(e.target.value)}
                  placeholder="Buscar partido, movimiento, alianza o número de lista..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {botonesFiltro.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroDignidad(f.id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition cursor-pointer ${
                      filtroDignidad === f.id
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {!cargando && !error && (
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Mostrando {filtradas.length} de {datos.length} organizaciones (toca cualquiera para ver sus candidatos)
                </p>
              )}
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-2.5 bg-slate-50/50">
              {cargando && (
                <div className="py-10 flex items-center justify-center gap-2 text-sm font-bold text-blue-700">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando organizaciones…</span>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm font-semibold text-rose-800">
                  {error}
                </div>
              )}

              {!cargando && !error && filtradas.length === 0 && (
                <p className="text-center py-8 text-sm text-slate-600">
                  No se encontraron organizaciones con ese filtro.
                </p>
              )}

              {!cargando &&
                !error &&
                filtradas.slice(0, 120).map((item) => {
                  const badges = [
                    { label: 'Alcaldías', value: item.alcalde },
                    { label: 'Prefecturas', value: item.prefecto },
                    { label: 'Concejalías', value: item.concejal },
                    { label: 'J. Parroquiales', value: item.junta_parroquial },
                  ].filter((b) => b.value > 0);

                  return (
                    <button
                      key={`${item.organizacion}-${item.lista}`}
                      type="button"
                      onClick={() => abrirOrganizacion(item)}
                      className="w-full text-left bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-2xl p-4 shadow-2xs space-y-3 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-block text-xs sm:text-sm font-black text-blue-700 uppercase tracking-wide">
                            Lista {item.lista || 'S/N'} · {item.provincias}{' '}
                            {item.provincias === 1 ? 'provincia' : 'provincias'}
                          </span>
                          <h4 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-blue-700 mt-0.5 leading-snug">
                            {titulo(item.organizacion)}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-lg sm:text-xl font-black text-slate-900">{item.total}</span>
                            <span className="block text-xs text-slate-600 font-semibold">
                              {item.total === 1 ? 'candidatura' : 'candidaturas'}
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs sm:text-sm">
                        {badges.map((b) => (
                          <span
                            key={b.label}
                            className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 rounded-xl px-3 py-1 font-semibold"
                          >
                            <strong className="text-slate-900">{b.value}</strong>
                            <span>{b.label}</span>
                          </span>
                        ))}
                        {item.con_plan > 0 && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3 py-1 font-semibold">
                            <strong>{item.con_plan}</strong>
                            <span>con PDF</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

              {!cargando && !error && filtradas.length > 120 && (
                <p className="text-center text-xs sm:text-sm text-slate-600 pt-2">
                  Mostrando las primeras 120 organizaciones. Usa el buscador para filtrar una específica.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="p-4 sm:px-6 border-b border-slate-100 shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={filtroCandTexto}
                  onChange={(e) => setFiltroCandTexto(e.target.value)}
                  placeholder="Filtrar candidato, provincia o cantón..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {botonesFiltro.map((f) => {
                  const cuenta =
                    f.id === 'todas'
                      ? seleccionada.total
                      : seleccionada[f.id];
                  if (f.id !== 'todas' && cuenta === 0) return null;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroCandDignidad(f.id)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition cursor-pointer ${
                        filtroCandDignidad === f.id
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {f.label} · {cuenta}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-2.5 bg-slate-50/50">
              {cargandoCand && (
                <div className="py-10 flex items-center justify-center gap-2 text-sm font-bold text-blue-700">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando candidaturas inscritas…</span>
                </div>
              )}

              {!cargandoCand && candidatosVisibles.length === 0 && (
                <p className="text-center py-8 text-sm text-slate-600">
                  No se encontraron candidaturas con ese filtro.
                </p>
              )}

              {!cargandoCand &&
                candidatosVisibles.slice(0, 150).map((fila) => {
                  const lugar = [titulo(fila.parroquia), titulo(fila.canton), titulo(fila.provincia)]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <div
                      key={fila.cod_formulario}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-blue-700 uppercase">
                            {etiquetaSubtipo(fila.subtipo)}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                              fila.tiene_plan && fila.cod_plan > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {fila.tiene_plan && fila.cod_plan > 0 ? 'Plan disponible' : 'Sin PDF'}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">
                          {titulo(fila.candidato)}
                        </h4>
                        {fila.alterno && (
                          <p className="text-xs sm:text-sm text-slate-600">Alterno: {titulo(fila.alterno)}</p>
                        )}
                        <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1">{lugar}</p>
                      </div>

                      {onSelectSugerencia && (
                        <button
                          type="button"
                          onClick={() => irACandidatura(fila)}
                          className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <span>Ver plan</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
