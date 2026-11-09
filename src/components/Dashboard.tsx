import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { PROVINCIAS_DATA } from '../data/geo_data';
import { Sugerencia, cargarCatalogo, sugerenciaDesdeMapa, type FilaPlan } from '../utils/catalogoPlanes';
import ExplorarPlanes from './ExplorarPlanes';
import Header from './Header';
import MapExplorer from './MapExplorer';
import DisclaimerModal from './DisclaimerModal';

const COLOR_PALETTE = [
  '#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#4ade80',
  '#f472b6', '#22d3ee', '#818cf8', '#2dd4bf', '#fbbf24',
];

function normStr(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function provToFile(name: string): string {
  return normStr(name).replace(/\s+/g, '_');
}

export default function Dashboard() {
  const [provincia, setProvincia] = useState('TODAS');
  const [canton, setCanton] = useState('TODOS');
  const [navLevel, setNavLevel] = useState<'ecuador' | 'provincia' | 'canton' | 'planes'>('ecuador');
  const [exploracion, setExploracion] = useState<Sugerencia | null>(null);
  const [vista, setVista] = useState<'mapa' | 'lista'>(() =>
    window.matchMedia('(max-width: 767px)').matches ? 'lista' : 'mapa'
  );
  const [catalogo, setCatalogo] = useState<FilaPlan[]>([]);
  const [activeProvGeo, setActiveProvGeo] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [hoveredEntity, setHoveredEntity] = useState<{
    title: string;
    subtitle?: string;
    metrics: { label: string; value: string | number }[];
    candidatosStats?: {
      total: number;
      prefectura?: number;
      alcaldia?: number;
      concejales?: number;
      juntas_parroquiales?: number;
      organizaciones?: number;
    };
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const provinciasList = useMemo(
    () => ['TODAS', ...PROVINCIAS_DATA.map((item) => item.displayName || item.name)],
    []
  );
  const cantonesVisibles = useMemo(() => {
    if (!activeProvGeo) return [] as string[];
    const nombres = new Set<string>();
    if (Array.isArray(activeProvGeo.cantons)) {
      activeProvGeo.cantons.forEach((nombre: string) => nombre && nombres.add(nombre));
    }
    if (Array.isArray(activeProvGeo.parishes)) {
      activeProvGeo.parishes.forEach((parroquia: { canton?: string }) => parroquia?.canton && nombres.add(parroquia.canton));
    }
    return [...nombres].sort((a, b) => a.localeCompare(b, 'es'));
  }, [activeProvGeo]);

  const [filtroTexto, setFiltroTexto] = useState('');

  const nombreProvincia = useMemo(() => {
    if (provincia === 'TODAS') return '';
    return (
      PROVINCIAS_DATA.find(
        (item) => normStr(item.name) === normStr(provincia) || normStr(item.displayName) === normStr(provincia)
      )?.displayName || provincia
    );
  }, [provincia]);

  const provinciasFiltradas = useMemo(() => {
    if (!filtroTexto.trim()) return PROVINCIAS_DATA;
    const q = normStr(filtroTexto);
    return PROVINCIAS_DATA.filter((item) => normStr(item.displayName || item.name).includes(q));
  }, [filtroTexto]);

  const cantonesFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return cantonesVisibles;
    const q = normStr(filtroTexto);
    return cantonesVisibles.filter((nombre) => normStr(nombre).includes(q));
  }, [cantonesVisibles, filtroTexto]);

  useEffect(() => {
    if (provincia === 'TODAS') {
      setActiveProvGeo(null);
      return;
    }
    const fileSlug = provToFile(provincia);
    setLoadingMap(true);
    fetch(`/data/provinces/${fileSlug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el mapa');
        return res.json();
      })
      .then((data) => {
        setActiveProvGeo(data);
        setLoadingMap(false);
      })
      .catch(() => {
        setActiveProvGeo(null);
        setLoadingMap(false);
      });
  }, [provincia]);

  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#provincia-')) {
        const slug = hash.replace('#provincia-', '');
        const match = provinciasList.find((item) => item !== 'TODAS' && provToFile(item) === slug);
        if (match) {
          setProvincia(match);
          setCanton('TODOS');
          setNavLevel('provincia');
        }
      } else if (hash === '#planes' || hash === '#ecuador' || hash === '') {
        setProvincia('TODAS');
        setCanton('TODOS');
        setNavLevel('ecuador');
        if (hash === '#planes') {
          window.history.replaceState({ navLevel: 'ecuador' }, '', '#ecuador');
        }
      }
    };
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, [provinciasList]);

  const svgViewBox = useMemo(() => {
    if (!activeProvGeo?.bbox) return '0 0 800 600';
    const [minX, minY, maxX, maxY] = activeProvGeo.bbox;
    const w = maxX - minX || 800;
    const h = maxY - minY || 600;
    const padding = Math.max(w, h) * 0.08;
    return `${minX - padding} ${minY - padding} ${w + padding * 2} ${h + padding * 2}`;
  }, [activeProvGeo]);

  const goToEcuador = () => {
    setHoveredEntity(null);
    setProvincia('TODAS');
    setCanton('TODOS');
    setNavLevel('ecuador');
    window.history.pushState({ navLevel: 'ecuador' }, '', '#ecuador');
  };

  const goToProvincia = (provName: string) => {
    setHoveredEntity(null);
    setProvincia(provName);
    setCanton('TODOS');
    setNavLevel('provincia');
    window.history.pushState({ navLevel: 'provincia' }, '', `#provincia-${provToFile(provName)}`);
  };

  const abrirExploracion = useCallback((item: Sugerencia) => {
    setExploracion(item);
    setHoveredEntity(null);
    cargarCatalogo().then(setCatalogo).catch(() => setCatalogo([]));
  }, []);

  const abrirDesdeMapa = useCallback((provinciaNombre: string, cantonNombre?: string) => {
    setHoveredEntity(null);
    cargarCatalogo().then((rows) => {
      setCatalogo(rows);
      const sugerencia = sugerenciaDesdeMapa(rows, provinciaNombre, cantonNombre);
      if (sugerencia) setExploracion(sugerencia);
    });
  }, []);

  const goHome = useCallback(() => {
    setExploracion(null);
    setHoveredEntity(null);
    setProvincia('TODAS');
    setCanton('TODOS');
    setNavLevel('ecuador');
    setFiltroTexto('');
    window.history.pushState({ navLevel: 'ecuador' }, '', '#ecuador');
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 font-sans antialiased pb-16">
      <DisclaimerModal onAccept={() => {}} />
      <Header
        navLevel={navLevel}
        explorando={Boolean(exploracion)}
        onBackToMap={() => {
          if (exploracion) {
            setExploracion(null);
            return;
          }
          setHoveredEntity(null);
          setNavLevel(canton !== 'TODOS' ? 'canton' : provincia !== 'TODAS' ? 'provincia' : 'ecuador');
        }}
        onHome={goHome}
        onExplore={abrirExploracion}
      />

      <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 mt-4 sm:mt-6 pb-[env(safe-area-inset-bottom)]">
        {exploracion ? (
          <ExplorarPlanes filas={catalogo} sugerencia={exploracion} onVolver={() => setExploracion(null)} />
        ) : (
          <>
            <div className="mb-4 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVista('mapa')}
                  className={`min-h-12 rounded-2xl text-sm font-bold border ${vista === 'mapa' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  Mapa
                </button>
                <button
                  type="button"
                  onClick={() => setVista('lista')}
                  className={`min-h-12 rounded-2xl text-sm font-bold border ${vista === 'lista' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  Elegir lugar
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-3">
                {vista === 'mapa'
                  ? 'Toca una provincia y después un cantón. En el teléfono es más cómodo Elegir lugar.'
                  : 'Elige la provincia y después el cantón. No hace falta mantener el dedo sobre el mapa.'}
              </p>
            </div>
            {vista === 'lista' && (
              <div className="mb-4 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                {provincia === 'TODAS' ? (
                  <div>
                    <div className="mb-3">
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Selecciona una Provincia
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Elige una provincia del Ecuador para consultar sus planes a Prefectura y Alcaldías
                      </p>
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                        placeholder="Buscar provincia (ej. Pichincha, Guayas, Manabí)..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                      {provinciasFiltradas.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFiltroTexto('');
                            goToProvincia(item.name);
                          }}
                          className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-left transition group shadow-2xs flex flex-col justify-between cursor-pointer"
                        >
                          <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 line-clamp-1">
                            {item.displayName}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-2 font-semibold flex items-center justify-between">
                            <span>Ver cantones</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
                          </span>
                        </button>
                      ))}
                    </div>

                    {provinciasFiltradas.length === 0 && (
                      <p className="text-center py-6 text-xs text-slate-400">
                        No se encontró ninguna provincia con "{filtroTexto}".
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Barra de navegación superior (Reemplaza al confuso botón 'Todas las provincias') */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroTexto('');
                          goToEcuador();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Volver a Provincias</span>
                      </button>
                      <span className="text-xs text-slate-500 font-bold truncate max-w-[200px]">
                        Ecuador › {nombreProvincia}
                      </span>
                    </div>

                    {/* Tarjeta destacada para la Prefectura Provincial */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-400/30">
                          Gobierno Provincial
                        </span>
                        <h3 className="text-base font-black text-white mt-1">
                          Prefectura de {nombreProvincia}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Planes de trabajo para Prefecto y Viceprefecto
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => abrirDesdeMapa(provincia)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs rounded-xl transition shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Ver Prefectura</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Listado de Cantones / Alcaldías */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                            Cantones de {nombreProvincia} ({cantonesVisibles.length})
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Planes para Alcaldes, concejales y juntas parroquiales
                          </p>
                        </div>
                      </div>

                      {cantonesVisibles.length > 5 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={filtroTexto}
                            onChange={(e) => setFiltroTexto(e.target.value)}
                            placeholder={`Buscar cantón en ${nombreProvincia}...`}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          />
                        </div>
                      )}

                      {loadingMap && (
                        <p className="px-2 py-4 text-xs font-bold text-slate-400 text-center animate-pulse">
                          Cargando cantones de {nombreProvincia}…
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                        {cantonesFiltrados.map((nombre) => (
                          <button
                            key={nombre}
                            type="button"
                            onClick={() => abrirDesdeMapa(provincia, nombre)}
                            className="px-3.5 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-left font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between group transition cursor-pointer"
                          >
                            <span className="truncate">{nombre}</span>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
                          </button>
                        ))}
                      </div>

                      {cantonesFiltrados.length === 0 && !loadingMap && (
                        <p className="text-center py-6 text-xs text-slate-400">
                          No se encontraron cantones con el filtro "{filtroTexto}".
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'mapa' && <MapExplorer
              navLevel={navLevel === 'planes' ? 'ecuador' : navLevel}
              provincia={provincia}
              canton={canton}
              loadingMap={loadingMap}
              activeProvGeo={activeProvGeo}
              svgViewBox={svgViewBox}
              COLOR_PALETTE={COLOR_PALETTE}
              onGoToProvincia={goToProvincia}
              onGoToCanton={(cantonNombre) => abrirDesdeMapa(provincia, cantonNombre)}
              onGoToEcuador={goToEcuador}
              onGoToPlanes={() => {
                if (provincia !== 'TODAS') abrirDesdeMapa(provincia, canton !== 'TODOS' ? canton : undefined);
              }}
              onSwitchToLista={() => setVista('lista')}
              onMouseMove={(e, title, metrics, candidatosStats, subtitle) => {
                setTooltipPos({ x: e.clientX + 15, y: e.clientY - 20 });
                setHoveredEntity({ title, subtitle, metrics, candidatosStats });
              }}
              onMouseLeave={() => setHoveredEntity(null)}
            />}
          </>
        )}
      </main>

      {hoveredEntity && (
        <div
          className="fixed z-50 pointer-events-none bg-white text-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-200 min-w-[260px] max-w-[300px]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-2 mb-2.5 gap-3">
            <h4 className="font-extrabold text-base text-slate-900">{hoveredEntity.title}</h4>
            <span className="text-[11px] font-semibold text-slate-400 text-right">{hoveredEntity.subtitle}</span>
          </div>
          {hoveredEntity.candidatosStats && (
            <div className="space-y-1.5 text-sm pb-2.5 border-b border-slate-100">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Listas inscritas</span>
                <span>{hoveredEntity.candidatosStats.total.toLocaleString('es-EC')}</span>
              </div>
              {hoveredEntity.candidatosStats.prefectura !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Prefectura</span>
                  <span className="font-bold text-slate-900">{hoveredEntity.candidatosStats.prefectura}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Alcaldías</span>
                <span className="font-bold text-slate-900">{hoveredEntity.candidatosStats.alcaldia}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Concejalías</span>
                <span className="font-bold text-slate-900">{hoveredEntity.candidatosStats.concejales}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Juntas parroquiales</span>
                <span className="font-bold text-slate-900">{hoveredEntity.candidatosStats.juntas_parroquiales}</span>
              </div>
              {hoveredEntity.candidatosStats.organizaciones !== undefined && (
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>Organizaciones</span>
                  <span className="font-bold text-slate-900">{hoveredEntity.candidatosStats.organizaciones}</span>
                </div>
              )}
            </div>
          )}
          {hoveredEntity.metrics.length > 0 && (
            <div className="pt-2 space-y-1 text-sm">
              {hoveredEntity.metrics.map((metric) => (
                <div key={metric.label} className="flex justify-between text-slate-500">
                  <span>{metric.label}</span>
                  <span className="font-semibold text-slate-800">{metric.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
