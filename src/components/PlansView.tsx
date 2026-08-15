import {
  Grid, Columns, Users, CheckCircle2, AlertCircle, XCircle, Sparkles, TrendingUp, Info, FileSpreadsheet, ArrowRight, Check
} from 'lucide-react';
import { Candidato, SimilitudCandidato } from '../types/electoral';
import CandidatoCard from './CandidatoCard';

interface PlansViewProps {
  provincia: string;
  canton: string;
  selectedParroquia: string;
  candidatosFiltrados: Candidato[];
  estadisticas: {
    total: number;
    distribucionCompetencias: Record<string, number>;
  };
  activeTab: 'directorio' | 'comparador';
  setActiveTab: (tab: 'directorio' | 'comparador') => void;
  selectedKeywords: string[];
  toggleKeyword: (kw: string) => void;
  topKeywords: string[];
  sortPlanesBy: 'fecha_desc' | 'viabilidad_desc' | 'paginas_asc' | 'paginas_desc';
  setSortPlanesBy: (s: 'fecha_desc' | 'viabilidad_desc' | 'paginas_asc' | 'paginas_desc') => void;
  anchorCandidate: Candidato | null;
  setAnchorCandidate: (c: Candidato | null) => void;
  sortedAnchorCandidates: Candidato[];
  matrizSimilitud: {
    candidatos: Candidato[];
    matriz: (SimilitudCandidato | null)[][];
  };
  onOpenDetailModal: (c: Candidato) => void;
  onOpenSimilarityModal: (a: Candidato, b: Candidato, sim: SimilitudCandidato) => void;
  onResetKeywords: () => void;
}

export default function PlansView({
  provincia,
  canton,
  selectedParroquia,
  candidatosFiltrados,
  estadisticas,
  activeTab,
  setActiveTab,
  selectedKeywords,
  toggleKeyword,
  topKeywords,
  sortPlanesBy,
  setSortPlanesBy,
  anchorCandidate,
  setAnchorCandidate,
  sortedAnchorCandidates,
  matrizSimilitud,
  onOpenDetailModal,
  onOpenSimilarityModal,
  onResetKeywords,
}: PlansViewProps) {
  const total = estadisticas.total || 1;
  const countExclusiva = estadisticas.distribucionCompetencias['Competencia exclusiva municipal'] || 0;
  const countConcurrente = estadisticas.distribucionCompetencias['Competencia concurrente'] || 0;
  const countFuera = estadisticas.distribucionCompetencias['Fuera de competencia'] || 0;

  const pctExclusiva = Math.round((countExclusiva / total) * 100);
  const pctConcurrente = Math.round((countConcurrente / total) * 100);
  const pctFuera = Math.round((countFuera / total) * 100);

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {/* HERO BANNER INSTITUCIONAL DE PLANES */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Adorno visual de fondo */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            {/* Breadcrumb de Jurisdicción */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bg-blue-500/20 text-blue-200 text-sm font-bold px-3.5 py-1 rounded-full border border-blue-400/30 backdrop-blur-md">
                📍 {provincia !== 'TODAS' ? `Provincia: ${provincia}` : 'Nivel Nacional'}
              </span>
              {canton !== 'TODOS' && (
                <span className="bg-slate-800 text-slate-200 text-sm font-bold px-3.5 py-1 rounded-full border border-slate-700">
                  Cantón: {canton}
                </span>
              )}
              {selectedParroquia !== 'TODAS' && (
                <span className="bg-slate-800 text-slate-200 text-sm font-bold px-3.5 py-1 rounded-full border border-slate-700">
                  Parroquia: {selectedParroquia}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Planes de Trabajo y Viabilidad Jurídica COOTAD
            </h2>
            <p className="text-base sm:text-lg text-slate-300 font-medium mt-2.5 max-w-2xl leading-relaxed">
              Consulte el desglose riguroso de propuestas de los <strong className="text-white font-bold">{candidatosFiltrados.length} planes registrados</strong> ante el Consejo Nacional Electoral (CNE).
            </p>
          </div>

          {/* Selector de Pestañas con estilo Segmented Control */}
          <div className="bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-2xl flex items-center gap-2 shadow-inner backdrop-blur-md self-stretch sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('directorio')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 min-h-[48px] ${
                activeTab === 'directorio'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Grid className="h-5 w-5" />
              <span>Fichas y Propuestas ({candidatosFiltrados.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('comparador')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 min-h-[48px] ${
                activeTab === 'comparador'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Columns className="h-5 w-5" />
              <span>Matriz y Comparador</span>
              {anchorCandidate && (
                <span className="ml-1.5 bg-cyan-300 text-slate-950 text-xs px-2.5 py-0.5 rounded-full font-black">
                  Ancla: {anchorCandidate.nombre.split(' ')[0]}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS DE INDICADORES CLAVE (KPI METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Candidatos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Planes Registrados
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{estadisticas.total}</div>
            <span className="text-sm font-semibold text-blue-600 mt-1.5 inline-block">100% circunscripción oficial</span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <Users className="h-7 w-7" />
          </div>
        </div>

        {/* KPI 2: Viabilidad Exclusiva */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-sm font-bold text-emerald-900 uppercase tracking-wider block mb-1.5">
              Exclusiva Municipal
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 tracking-tight">{countExclusiva}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-20 h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div style={{ width: `${pctExclusiva}%` }} className="bg-emerald-600 h-full rounded-full" />
              </div>
              <span className="text-sm font-bold text-emerald-800">{pctExclusiva}% del total</span>
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <CheckCircle2 className="h-7 w-7" />
          </div>
        </div>

        {/* KPI 3: Concurrente */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-sm font-bold text-amber-900 uppercase tracking-wider block mb-1.5">
              Competencia Concurrente
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-600 tracking-tight">{countConcurrente}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-20 h-2 bg-amber-100 rounded-full overflow-hidden">
                <div style={{ width: `${pctConcurrente}%` }} className="bg-amber-500 h-full rounded-full" />
              </div>
              <span className="text-sm font-bold text-amber-800">{pctConcurrente}% del total</span>
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <AlertCircle className="h-7 w-7" />
          </div>
        </div>

        {/* KPI 4: Fuera de Competencia */}
        <div className="bg-white border border-rose-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-sm font-bold text-rose-900 uppercase tracking-wider block mb-1.5">
              Fuera de Competencia
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-rose-600 tracking-tight">{countFuera}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-20 h-2 bg-rose-100 rounded-full overflow-hidden">
                <div style={{ width: `${pctFuera}%` }} className="bg-rose-500 h-full rounded-full" />
              </div>
              <span className="text-sm font-bold text-rose-800">{pctFuera}% del total</span>
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <XCircle className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTRADO POR PALABRAS CLAVE Y ORDENAMIENTO */}
      {activeTab === 'directorio' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-base font-bold text-slate-800 uppercase tracking-wider">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span>Filtrar por Ejes Temáticos:</span>
            </div>

            {/* Dropdown Ordenar */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <span className="text-sm font-bold text-slate-600 uppercase tracking-wider shrink-0">Ordenar por:</span>
              <select
                value={sortPlanesBy}
                onChange={(e) => setSortPlanesBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm md:text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[48px] shadow-2xs w-full sm:w-auto"
              >
                <option value="fecha_desc">Inscripción Más Reciente (Fecha)</option>
                <option value="viabilidad_desc">Mayor Viabilidad Jurídica COOTAD</option>
                <option value="paginas_desc">Mayor Extensión del Plan (Páginas)</option>
                <option value="paginas_asc">Menor Extensión del Plan (Páginas)</option>
              </select>
            </div>
          </div>

          {/* Chips de Keywords */}
          <div className="flex flex-wrap gap-2.5 pt-3 border-t border-slate-100 items-center">
            {topKeywords.map((kw) => {
              const active = selectedKeywords.includes(kw);
              return (
                <button
                  key={kw}
                  onClick={() => toggleKeyword(kw)}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all duration-150 flex items-center gap-2 ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                  }`}
                >
                  {active && <Check className="h-4 w-4" />}
                  <span>#{kw}</span>
                </button>
              );
            })}

            {selectedKeywords.length > 0 && (
              <button
                onClick={onResetKeywords}
                className="text-sm text-rose-600 font-bold px-3 py-2 hover:underline ml-auto"
              >
                Limpiar filtros ({selectedKeywords.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 1: DIRECTORIO DE PROPUESTAS */}
      {activeTab === 'directorio' && (
        <>
          {candidatosFiltrados.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-sm">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-extrabold text-slate-800">No se encontraron planes para los filtros seleccionados</h3>
              <p className="text-base text-slate-500 mt-2 max-w-md mx-auto">
                Pruebe desactivando algunos filtros temáticos o reiniciando la búsqueda para visualizar más candidatos.
              </p>
              <button
                onClick={onResetKeywords}
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-base transition shadow-sm min-h-[48px]"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {candidatosFiltrados.map((cand) => (
                <CandidatoCard
                  key={cand.id}
                  candidato={cand}
                  onOpenDetail={() => onOpenDetailModal(cand)}
                  onSelectAsAnchor={() => {
                    setAnchorCandidate(cand);
                    setActiveTab('comparador');
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* PESTAÑA 2: COMPARADOR CRUZADO Y ANCLA */}
      {activeTab === 'comparador' && (
        <div className="space-y-8">
          {/* MÓDULO ANCLA 1D */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  Comparador 1D con Candidato Ancla de Referencia
                </h3>
                <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                  Mide la cercanía programática de todos los planes respecto a una propuesta elegida como eje:
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider shrink-0">Eje de Referencia:</span>
                <select
                  value={anchorCandidate?.id || ''}
                  onChange={(e) => {
                    const found = candidatosFiltrados.find((c) => c.id === e.target.value);
                    setAnchorCandidate(found || null);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm md:text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[48px] w-full sm:w-auto shadow-2xs"
                >
                  <option value="">Seleccione candidato ancla...</option>
                  {candidatosFiltrados.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} (Lista {c.lista})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {anchorCandidate ? (
              <div className="space-y-6">
                {/* Banner de Candidato Ancla Activo */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-extrabold shadow-inner shrink-0">
                      {anchorCandidate.nombre.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider block">Candidato Ancla (Punto Cero):</span>
                      <h4 className="text-xl font-extrabold text-white leading-tight">{anchorCandidate.nombre}</h4>
                      <p className="text-sm text-blue-200 mt-0.5">{anchorCandidate.partido_politico} • Lista {anchorCandidate.lista}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAnchorCandidate(null)}
                    className="text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl border border-white/20 transition-colors min-h-[40px]"
                  >
                    Cambiar Referencia
                  </button>
                </div>

                {/* Grid de Candidatos Comparados */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sortedAnchorCandidates.map((cand) => {
                    const sim = (anchorCandidate.similitudes || []).find((s) => s.candidato_id === cand.id);
                    const pct = sim ? sim.porcentaje : 0;
                    return (
                      <div
                        key={cand.id}
                        className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="bg-slate-900 text-white text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full">
                              Lista {cand.lista}
                            </span>
                            <span className="bg-blue-50 text-blue-800 text-sm font-extrabold px-3.5 py-1 rounded-xl border border-blue-200 font-mono">
                              {pct.toFixed(1)}% Similitud
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-lg">{cand.nombre}</h4>
                          <p className="text-sm text-slate-600 font-medium mb-3.5 truncate">{cand.partido_politico}</p>

                          {/* Medidor visual de similitud */}
                          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 mb-3.5 border border-slate-200/80">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {sim && (
                          <button
                            onClick={() => onOpenSimilarityModal(anchorCandidate, cand, sim)}
                            className="w-full mt-2 bg-slate-50 hover:bg-blue-50 text-blue-700 hover:text-blue-900 border border-slate-200 hover:border-blue-300 font-bold text-xs sm:text-sm py-3 rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <Info className="h-4 w-4" />
                            <span>Ver Puntos de Acuerdo y Diferencias</span>
                            <ArrowRight className="h-4 w-4 ml-0.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center text-slate-500">
                <Columns className="h-14 w-14 text-slate-300 mx-auto mb-3" />
                <h4 className="text-lg font-bold text-slate-800">Seleccione un candidato para iniciar la comparación 1D</h4>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                  El algoritmo medirá el grado de afinidad semántica y legal de los demás planes contra su elección.
                </p>
              </div>
            )}
          </div>

          {/* MÓDULO MATRIZ CRUZADA NxN */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  Matriz Cruzada de Coincidencias Programáticas (NxN)
                </h3>
                <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                  Tabla cruzada de afinidad entre todos los candidatos. Haga clic en cualquier celda para ver el desglose:
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pb-4 pt-2">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-4 bg-slate-900 text-white rounded-tl-xl font-extrabold text-sm min-w-[180px]">
                      Candidato / Lista
                    </th>
                    {matrizSimilitud.candidatos.map((c, idx) => (
                      <th
                        key={c.id}
                        className={`p-3.5 bg-slate-100 border border-slate-200 font-bold text-slate-700 text-center min-w-[110px] ${
                          idx === matrizSimilitud.candidatos.length - 1 ? 'rounded-tr-xl' : ''
                        }`}
                      >
                        <div className="truncate font-extrabold text-sm">{c.nombre.split(' ')[0]}</div>
                        <span className="text-xs text-slate-500 font-semibold">Lista {c.lista}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrizSimilitud.candidatos.map((candA, rowIdx) => (
                    <tr key={candA.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 border border-slate-200 font-bold text-slate-900 bg-slate-50/90">
                        <div className="truncate font-extrabold text-sm sm:text-base">{candA.nombre}</div>
                        <span className="text-xs text-slate-600 font-semibold">Lista {candA.lista}</span>
                      </td>
                      {matrizSimilitud.candidatos.map((candB, colIdx) => {
                        if (rowIdx === colIdx) {
                          return (
                            <td
                              key={candB.id}
                              className="p-3.5 border border-slate-200 text-center font-bold text-slate-400 bg-slate-100/80 select-none text-sm"
                            >
                              100%
                            </td>
                          );
                        }
                        const sim = matrizSimilitud.matriz[rowIdx][colIdx];
                        const pct = sim ? sim.porcentaje : 0;
                        const bgClass =
                          pct >= 70 ? 'bg-blue-100 text-blue-900 font-extrabold hover:bg-blue-200' :
                          pct >= 50 ? 'bg-blue-50 text-blue-800 font-bold hover:bg-blue-100' :
                          'text-slate-700 font-semibold hover:bg-slate-100';

                        return (
                          <td
                            key={candB.id}
                            className={`p-3.5 border border-slate-200 text-center cursor-pointer transition-all ${bgClass}`}
                            onClick={() => {
                              if (sim) onOpenSimilarityModal(candA, candB, sim);
                            }}
                            title={`Ver comparativa entre ${candA.nombre} y ${candB.nombre} (${pct.toFixed(1)}%)`}
                          >
                            <span className="font-mono text-sm sm:text-base font-bold">{pct.toFixed(1)}%</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
