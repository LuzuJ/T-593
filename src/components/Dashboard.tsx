import { useState, useMemo, useEffect, useCallback } from 'react';
import { PROVINCIAS_DATA } from '../data/geo_data';
import { Sugerencia, buscarCatalogo, cargarCatalogo, sugerenciaDesdeMapa, type FilaPlan } from '../utils/catalogoPlanes';
import ExplorarPlanes from './ExplorarPlanes';
import CivicUploadAuditor from './CivicUploadAuditor';
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
  const [showAuditor, setShowAuditor] = useState(false);
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

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 font-sans antialiased pb-16">
      <DisclaimerModal onAccept={() => {}} />
      <Header
        navLevel={navLevel}
        explorando={Boolean(exploracion) || showAuditor}
        onBackToMap={() => {
          if (showAuditor) {
            setShowAuditor(false);
            return;
          }
          if (exploracion) {
            setExploracion(null);
            return;
          }
          setHoveredEntity(null);
          setNavLevel(canton !== 'TODOS' ? 'canton' : provincia !== 'TODAS' ? 'provincia' : 'ecuador');
        }}
        onExplore={abrirExploracion}
      />

      <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 mt-4 sm:mt-6 pb-[env(safe-area-inset-bottom)]">
        {showAuditor ? (
          <CivicUploadAuditor onClose={() => setShowAuditor(false)} onPlanAudited={() => undefined} />
        ) : exploracion ? (
          <ExplorarPlanes filas={catalogo} sugerencia={exploracion} onVolver={() => setExploracion(null)} />
        ) : (
          <>
            <div className="mb-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Empieza por un lugar</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">¿A quién quieres revisar?</h2>
              <p className="text-slate-600 mt-1">
                Busca un lugar arriba, o elige una provincia en el mapa y después un cantón. Las cifras del mapa cuentan listas del proceso 140.
              </p>
              {navLevel === 'provincia' && provincia !== 'TODAS' && (
                <button
                  type="button"
                  onClick={() => abrirDesdeMapa(provincia)}
                  className="mt-4 mr-2 px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-sm font-bold"
                >
                  Ver prefectura de {provincia}
                </button>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                {['Chone', 'alcalde de Quito', 'prefectura de Bolívar'].map((ejemplo) => (
                  <button
                    key={ejemplo}
                    type="button"
                    onClick={() => {
                      cargarCatalogo().then((rows) => {
                        setCatalogo(rows);
                        const primera = buscarCatalogo(rows, ejemplo)[0];
                        if (primera) setExploracion(primera);
                      });
                    }}
                    className="min-h-11 px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-sm font-bold"
                  >
                    {ejemplo}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAuditor(true)}
                  className="min-h-11 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 text-sm font-bold"
                >
                  Auditar un PDF propio
                </button>
              </div>
            </div>
            <MapExplorer
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
              onMouseMove={(e, title, metrics, candidatosStats, subtitle) => {
                setTooltipPos({ x: e.clientX + 15, y: e.clientY - 20 });
                setHoveredEntity({ title, subtitle, metrics, candidatosStats });
              }}
              onMouseLeave={() => setHoveredEntity(null)}
            />
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
