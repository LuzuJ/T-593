import { Compass, Search, History, FileText } from 'lucide-react';

interface FiltersSidebarProps {
  dignidad: string;
  setDignidad: (d: string) => void;
  provincia: string;
  canton: string;
  selectedParroquia: string;
  setSelectedParroquia: (p: string) => void;
  busqueda: string;
  setBusqueda: (b: string) => void;
  provinciasList: string[];
  cantonesList: string[];
  parroquiasList: string[];
  recentSearches: { provincia: string; canton: string }[];
  totalPlanes: number;
  onSelectProvincia: (p: string) => void;
  onSelectCanton: (c: string) => void;
  onGoToEcuador: () => void;
  onGoToPlanes: () => void;
}

export default function FiltersSidebar({
  dignidad,
  setDignidad,
  provincia,
  canton,
  selectedParroquia,
  setSelectedParroquia,
  busqueda,
  setBusqueda,
  provinciasList,
  cantonesList,
  parroquiasList,
  recentSearches,
  totalPlanes,
  onSelectProvincia,
  onSelectCanton,
  onGoToEcuador,
  onGoToPlanes,
}: FiltersSidebarProps) {
  return (
    <aside className="lg:col-span-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 shadow-md space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Compass className="h-6 w-6 text-blue-600" />
          Jurisdicción y Filtros
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Filtre las propuestas por nivel territorial o cargo de elección:
        </p>
      </div>

      {/* Dignidad */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Dignidad de Elección</span>
          <span className="text-[10px] text-slate-400 font-normal">Jerarquía Institucional</span>
        </label>
        <select
          value={dignidad}
          onChange={(e) => setDignidad(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all uppercase shadow-sm"
        >
          <option value="TODAS">TODAS LAS DIGNIDADES</option>
          <option value="Prefecto">🟢 1. PREFECTURA (PROVINCIAL)</option>
          <option value="Alcalde">🟣 2. ALCALDÍA (CANTONAL)</option>
          <option value="Concejal">🔵 3. CONCEJALÍA (URBANA / RURAL)</option>
          <option value="Vocal Junta Parroquial">🟠 4. JUNTA PARROQUIAL (RURAL)</option>
        </select>

        {/* Botones de Selección Rápida con Código de Color */}
        <div className="grid grid-cols-2 gap-1.5 mt-2.5">
          <button
            type="button"
            onClick={() => setDignidad(dignidad === 'Prefecto' ? 'TODAS' : 'Prefecto')}
            className={`text-xs font-bold py-2 px-2.5 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
              dignidad === 'Prefecto'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full shrink-0 ${dignidad === 'Prefecto' ? 'bg-white' : 'bg-emerald-600'}`}></span>
            Prefectura
          </button>

          <button
            type="button"
            onClick={() => setDignidad(dignidad === 'Alcalde' ? 'TODAS' : 'Alcalde')}
            className={`text-xs font-bold py-2 px-2.5 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
              dignidad === 'Alcalde'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full shrink-0 ${dignidad === 'Alcalde' ? 'bg-white' : 'bg-indigo-600'}`}></span>
            Alcaldía
          </button>

          <button
            type="button"
            onClick={() => setDignidad(dignidad === 'Concejal' ? 'TODAS' : 'Concejal')}
            className={`text-xs font-bold py-2 px-2.5 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
              dignidad === 'Concejal'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full shrink-0 ${dignidad === 'Concejal' ? 'bg-white' : 'bg-sky-600'}`}></span>
            Concejalía
          </button>

          <button
            type="button"
            onClick={() => setDignidad(dignidad === 'Vocal Junta Parroquial' ? 'TODAS' : 'Vocal Junta Parroquial')}
            className={`text-xs font-bold py-2 px-2.5 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
              dignidad === 'Vocal Junta Parroquial'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full shrink-0 ${dignidad === 'Vocal Junta Parroquial' ? 'bg-white' : 'bg-amber-600'}`}></span>
            Junta Parroq.
          </button>
        </div>
      </div>

      {/* Provincia */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Provincia
        </label>
        <select
          value={provincia}
          onChange={(e) => onSelectProvincia(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all uppercase shadow-sm"
        >
          <option value="TODAS">PROVINCIA (TODAS)</option>
          {provinciasList
            .filter((p) => p !== 'TODAS')
            .map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
        </select>
      </div>

      {/* Cantón */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Cantón
        </label>
        <select
          value={canton}
          onChange={(e) => onSelectCanton(e.target.value)}
          disabled={provincia === 'TODAS'}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all uppercase shadow-sm"
        >
          <option value="TODOS">CANTÓN (TODOS)</option>
          {cantonesList
            .filter((c) => c !== 'TODOS')
            .map((cant) => (
              <option key={cant} value={cant}>
                {cant}
              </option>
            ))}
        </select>
        {provincia === 'TODAS' && (
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Seleccione una provincia para habilitar cantones</p>
        )}
      </div>

      {/* Parroquia */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Parroquia
        </label>
        <select
          value={selectedParroquia}
          onChange={(e) => setSelectedParroquia(e.target.value)}
          disabled={canton === 'TODOS'}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all uppercase shadow-sm"
        >
          <option value="TODAS">PARROQUIA (TODAS)</option>
          {parroquiasList
            .filter((p) => p !== 'TODAS')
            .map((parr) => (
              <option key={parr} value={parr}>
                {parr}
              </option>
            ))}
        </select>
        {canton === 'TODOS' && (
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Seleccione un cantón para habilitar parroquias</p>
        )}
      </div>

      {/* Búsqueda rápida */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Búsqueda por Candidato o Tema
        </label>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Ej. Seguridad, Movilidad, Salud..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Historial de Navegación Reciente */}
      {recentSearches.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-blue-600" />
            Consultas Recientes
          </label>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectProvincia(item.provincia);
                  if (item.canton && item.canton !== 'TODOS') onSelectCanton(item.canton);
                }}
                className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition-all shadow-xs"
              >
                {item.provincia} {item.canton && item.canton !== 'TODOS' ? `› ${item.canton}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <button
          onClick={onGoToPlanes}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold py-3.5 px-5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 transform active:scale-95"
        >
          <FileText className="h-5 w-5" />
          VER PLANES DE TRABAJO ({totalPlanes})
        </button>
        <button
          onClick={onGoToEcuador}
          className="w-full bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-sm"
        >
          REINICIAR A VISTA NACIONAL
        </button>
      </div>
    </aside>
  );
}
