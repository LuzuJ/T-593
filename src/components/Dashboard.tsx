import { useState, useMemo, useEffect } from 'react';
import { useElectoralData } from '../hooks/useElectoralData';
import mockCandidatosRaw from '../data/mock_candidatos.json';
import { Candidato, SimilitudCandidato } from '../types/electoral';
import Header from './Header';
import FiltersSidebar from './FiltersSidebar';
import MapExplorer from './MapExplorer';
import PlansView from './PlansView';
import CandidateDetailModal from './CandidateDetailModal';
import SimilarityDetailModal from './SimilarityDetailModal';

const candidatosData = mockCandidatosRaw as Candidato[];

const COLOR_PALETTE = [
  '#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#4ade80',
  '#f472b6', '#22d3ee', '#818cf8', '#2dd4bf', '#fbbf24',
];

function provToFile(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

export default function Dashboard() {
  const { candidatosFiltrados, estadisticas, filtros } = useElectoralData(candidatosData);

  // Estados de navegación
  const [navLevel, setNavLevel] = useState<'ecuador' | 'provincia' | 'canton' | 'planes'>('ecuador');
  const [selectedParroquia, setSelectedParroquia] = useState<string>('TODAS');

  // Mapas vectoriales
  const [activeProvGeo, setActiveProvGeo] = useState<any>(null);
  const [activeCantonGeo, setActiveCantonGeo] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState<boolean>(false);

  // Tooltip
  const [hoveredEntity, setHoveredEntity] = useState<{
    title: string;
    metrics: { label: string; value: string | number }[];
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Pestañas y filtros de planes
  const [activeTab, setActiveTab] = useState<'directorio' | 'comparador'>('directorio');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [sortPlanesBy, setSortPlanesBy] = useState<'fecha_desc' | 'viabilidad_desc' | 'paginas_asc' | 'paginas_desc'>('fecha_desc');
  const [anchorCandidate, setAnchorCandidate] = useState<Candidato | null>(null);

  // Modales
  const [selectedCandidateModal, setSelectedCandidateModal] = useState<Candidato | null>(null);
  const [similarityModalData, setSimilarityModalData] = useState<{
    candA: Candidato;
    candB: Candidato;
    sim: SimilitudCandidato;
  } | null>(null);

  // Historial de búsquedas recientes
  const [recentSearches, setRecentSearches] = useState<{ provincia: string; canton: string }[]>(() => {
    try {
      const saved = localStorage.getItem('electoral_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = (prov: string, cant: string) => {
    if (prov === 'TODAS') return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => !(item.provincia === prov && item.canton === cant));
      const next = [{ provincia: prov, canton: cant }, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('electoral_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Carga de GeoJSON provincial
  useEffect(() => {
    if (filtros.provincia === 'TODAS') {
      setActiveProvGeo(null);
      setActiveCantonGeo(null);
      return;
    }

    const fileSlug = provToFile(filtros.provincia);
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
  }, [filtros.provincia]);

  // Sincronización con Hash de la URL al cargar o cambiar
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#provincia-')) {
        const slug = hash.replace('#provincia-', '');
        // Buscar provincia por slug
        const provs = Array.from(new Set(candidatosData.map((c) => c.jurisdiccion.provincia)));
        const match = provs.find((p) => provToFile(p) === slug);
        if (match) {
          filtros.setProvincia(match);
          setNavLevel('provincia');
        }
      } else if (hash.startsWith('#canton-')) {
        const slug = hash.replace('#canton-', '');
        const cants = Array.from(new Set(candidatosData.map((c) => c.jurisdiccion.canton)));
        const match = cants.find((c) => provToFile(c) === slug);
        if (match) {
          filtros.setCanton(match);
          setNavLevel('canton');
        }
      } else if (hash === '#planes') {
        setNavLevel('planes');
      } else if (hash === '#ecuador' || hash === '') {
        filtros.setProvincia('TODAS');
        filtros.setCanton('TODOS');
        setNavLevel('ecuador');
      }
    };

    parseHash();

    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        if (e.state.navLevel) setNavLevel(e.state.navLevel);
        if (e.state.provincia) filtros.setProvincia(e.state.provincia);
        if (e.state.canton) filtros.setCanton(e.state.canton);
      } else {
        parseHash();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', parseHash);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', parseHash);
    };
  }, []);

  // Listas desplegables derivadas
  const provinciasList = useMemo(() => {
    const set = new Set(candidatosData.map((c) => c.jurisdiccion.provincia));
    return ['TODAS', ...Array.from(set).sort()];
  }, []);

  const cantonesList = useMemo(() => {
    if (filtros.provincia === 'TODAS') return ['TODOS'];
    const set = new Set(
      candidatosData
        .filter((c) => c.jurisdiccion.provincia === filtros.provincia)
        .map((c) => c.jurisdiccion.canton)
    );
    return ['TODOS', ...Array.from(set).sort()];
  }, [filtros.provincia]);

  const parroquiasList = useMemo(() => {
    return ['TODAS', 'CENTRO', 'NORTE', 'SUR', 'RURAL'];
  }, []);

  // ViewBox dinámico provincial
  const svgViewBox = useMemo(() => {
    if (!activeProvGeo || !activeProvGeo.bbox) return '0 0 800 600';
    const [minX, minY, maxX, maxY] = activeProvGeo.bbox;
    const w = maxX - minX || 800;
    const h = maxY - minY || 600;
    const padding = Math.max(w, h) * 0.08;
    return `${minX - padding} ${minY - padding} ${w + padding * 2} ${h + padding * 2}`;
  }, [activeProvGeo]);

  // ViewBox cantonal
  const svgCantonViewBox = useMemo(() => {
    if (!activeCantonGeo || !activeCantonGeo.bbox) return '0 0 600 400';
    const [minX, minY, maxX, maxY] = activeCantonGeo.bbox;
    const w = maxX - minX || 600;
    const h = maxY - minY || 400;
    const padding = Math.max(w, h) * 0.1;
    return `${minX - padding} ${minY - padding} ${w + padding * 2} ${h + padding * 2}`;
  }, [activeCantonGeo]);

  // Navegación
  const goToEcuador = (skipHistory = false) => {
    setHoveredEntity(null);
    filtros.setProvincia('TODAS');
    filtros.setCanton('TODOS');
    setSelectedParroquia('TODAS');
    setNavLevel('ecuador');
    if (!skipHistory) {
      window.history.pushState({ navLevel: 'ecuador', provincia: 'TODAS', canton: 'TODOS' }, '', '#ecuador');
    }
  };

  const goToProvincia = (provName: string, skipHistory = false) => {
    setHoveredEntity(null);
    filtros.setProvincia(provName);
    filtros.setCanton('TODOS');
    setSelectedParroquia('TODAS');
    setNavLevel('provincia');
    addRecentSearch(provName, 'TODOS');
    if (!skipHistory) {
      window.history.pushState({ navLevel: 'provincia', provincia: provName, canton: 'TODOS' }, '', `#provincia-${provToFile(provName)}`);
    }
  };

  const goToCanton = (cantonName: string, skipHistory = false) => {
    setHoveredEntity(null);
    filtros.setCanton(cantonName);
    setSelectedParroquia('TODAS');
    setNavLevel('canton');
    addRecentSearch(filtros.provincia, cantonName);
    if (!skipHistory) {
      window.history.pushState({ navLevel: 'canton', provincia: filtros.provincia, canton: cantonName }, '', `#canton-${provToFile(cantonName)}`);
    }
  };

  const goToPlanes = (parroquiaName?: string) => {
    setHoveredEntity(null);
    if (parroquiaName) setSelectedParroquia(parroquiaName);
    setNavLevel('planes');
    window.history.pushState({ navLevel: 'planes', provincia: filtros.provincia, canton: filtros.canton }, '', '#planes');
  };

  // Top Keywords
  const topKeywords = useMemo(() => {
    const map = new Map<string, number>();
    candidatosFiltrados.forEach((c) => {
      c.analisis.palabras_clave.forEach((kw) => {
        map.set(kw, (map.get(kw) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((entry) => entry[0]);
  }, [candidatosFiltrados]);

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  // Candidatos filtrados por keywords y ordenados
  const displayCandidatos = useMemo(() => {
    let result = [...candidatosFiltrados];
    if (selectedKeywords.length > 0) {
      result = result.filter((c) =>
        selectedKeywords.every((kw) => c.analisis.palabras_clave.includes(kw))
      );
    }

    if (sortPlanesBy === 'fecha_desc') {
      result.sort((a, b) => (b.fecha_inscripcion || '').localeCompare(a.fecha_inscripcion || ''));
    } else if (sortPlanesBy === 'viabilidad_desc') {
      const getViabScore = (cand: Candidato) => {
        const total = cand.analisis.promesas_clasificadas?.length || 1;
        const si = cand.analisis.promesas_clasificadas?.filter((p) => p.viable === 'Sí').length || 0;
        return si / total;
      };
      result.sort((a, b) => getViabScore(b) - getViabScore(a));
    } else if (sortPlanesBy === 'paginas_desc') {
      result.sort((a, b) => b.analisis.paginas_total - a.analisis.paginas_total);
    } else if (sortPlanesBy === 'paginas_asc') {
      result.sort((a, b) => a.analisis.paginas_total - b.analisis.paginas_total);
    }

    return result;
  }, [candidatosFiltrados, selectedKeywords, sortPlanesBy]);

  // Candidatos ordenados por ancla
  const sortedAnchorCandidates = useMemo(() => {
    if (!anchorCandidate) return displayCandidatos;
    const others = displayCandidatos.filter((c) => c.id !== anchorCandidate.id);
    return others.sort((a, b) => {
      const simA = (anchorCandidate.similitudes || []).find((s: SimilitudCandidato) => s.candidato_id === a.id);
      const simB = (anchorCandidate.similitudes || []).find((s: SimilitudCandidato) => s.candidato_id === b.id);
      return (simB ? simB.porcentaje : 0) - (simA ? simA.porcentaje : 0);
    });
  }, [anchorCandidate, displayCandidatos]);

  // Matriz NxN
  const matrizSimilitud = useMemo(() => {
    const candidates = displayCandidatos.slice(0, 8);
    const matriz: (SimilitudCandidato | null)[][] = [];

    for (let i = 0; i < candidates.length; i++) {
      const row: (SimilitudCandidato | null)[] = [];
      for (let j = 0; j < candidates.length; j++) {
        if (i === j) {
          row.push(null);
        } else {
          const sim = (candidates[i].similitudes || []).find(
            (s: SimilitudCandidato) => s.candidato_id === candidates[j].id
          );
          row.push(sim || null);
        }
      }
      matriz.push(row);
    }
    return { candidatos: candidates, matriz };
  }, [displayCandidatos]);

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 font-sans antialiased pb-16">
      {/* Header Institucional */}
      <Header
        navLevel={navLevel}
        totalCandidatos={estadisticas.total}
        onGoToPlanes={() => goToPlanes()}
        onBackToMap={() => {
          setHoveredEntity(null);
          setNavLevel(filtros.canton !== 'TODOS' ? 'canton' : filtros.provincia !== 'TODAS' ? 'provincia' : 'ecuador');
        }}
      />

      {/* Contenido Principal */}
      <main className="w-full max-w-[1600px] mx-auto px-4 md:px-8 mt-6">
        {navLevel !== 'planes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <FiltersSidebar
              dignidad={filtros.dignidad}
              setDignidad={filtros.setDignidad}
              provincia={filtros.provincia}
              canton={filtros.canton}
              selectedParroquia={selectedParroquia}
              setSelectedParroquia={setSelectedParroquia}
              busqueda={filtros.busqueda}
              setBusqueda={filtros.setBusqueda}
              provinciasList={provinciasList}
              cantonesList={cantonesList}
              parroquiasList={parroquiasList}
              recentSearches={recentSearches}
              totalPlanes={estadisticas.total}
              onSelectProvincia={(p) => {
                if (p === 'TODAS') goToEcuador();
                else goToProvincia(p);
              }}
              onSelectCanton={(c) => {
                if (c === 'TODOS') setNavLevel('provincia');
                else goToCanton(c);
              }}
              onGoToEcuador={() => goToEcuador()}
              onGoToPlanes={() => goToPlanes()}
            />

            <MapExplorer
              navLevel={navLevel}
              provincia={filtros.provincia}
              canton={filtros.canton}
              loadingMap={loadingMap}
              activeProvGeo={activeProvGeo}
              activeCantonGeo={activeCantonGeo}
              svgViewBox={svgViewBox}
              svgCantonViewBox={svgCantonViewBox}
              COLOR_PALETTE={COLOR_PALETTE}
              onGoToProvincia={goToProvincia}
              onGoToCanton={goToCanton}
              onGoToEcuador={goToEcuador}
              onGoToPlanes={goToPlanes}
              onMouseMove={(e, title, metrics) => {
                setTooltipPos({ x: e.clientX + 15, y: e.clientY - 20 });
                setHoveredEntity({ title, metrics });
              }}
              onMouseLeave={() => setHoveredEntity(null)}
            />
          </div>
        ) : (
          <PlansView
            provincia={filtros.provincia}
            canton={filtros.canton}
            selectedParroquia={selectedParroquia}
            candidatosFiltrados={displayCandidatos}
            estadisticas={estadisticas}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedKeywords={selectedKeywords}
            toggleKeyword={toggleKeyword}
            topKeywords={topKeywords}
            sortPlanesBy={sortPlanesBy}
            setSortPlanesBy={setSortPlanesBy}
            anchorCandidate={anchorCandidate}
            setAnchorCandidate={setAnchorCandidate}
            sortedAnchorCandidates={sortedAnchorCandidates}
            matrizSimilitud={matrizSimilitud}
            onOpenDetailModal={(c) => setSelectedCandidateModal(c)}
            onOpenSimilarityModal={(a, b, sim) => setSimilarityModalData({ candA: a, candB: b, sim })}
            onResetKeywords={() => setSelectedKeywords([])}
          />
        )}
      </main>

      {/* Tooltip Flotante Institucional */}
      {hoveredEntity && navLevel !== 'planes' && (
        <div
          className="fixed z-50 pointer-events-none bg-white/95 text-slate-800 text-sm p-4 rounded-2xl shadow-2xl border border-slate-200/90 backdrop-blur-xl transition-all duration-75 min-w-[250px] ring-1 ring-slate-900/5"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <h4 className="font-extrabold text-base text-slate-900 leading-snug">
              {hoveredEntity.title}
            </h4>
          </div>
          <div className="space-y-1.5">
            {hoveredEntity.metrics.map((m, i) => (
              <div key={i} className="flex justify-between items-center text-xs sm:text-sm gap-4">
                <span className="text-slate-500 font-semibold">{m.label}:</span>
                <span className="font-bold text-slate-900 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/70 shadow-2xs">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Ficha Completa */}
      {selectedCandidateModal && (
        <CandidateDetailModal
          candidato={selectedCandidateModal}
          onClose={() => setSelectedCandidateModal(null)}
        />
      )}

      {/* Modal Análisis Comparativo */}
      {similarityModalData && (
        <SimilarityDetailModal
          candA={similarityModalData.candA}
          candB={similarityModalData.candB}
          sim={similarityModalData.sim}
          onClose={() => setSimilarityModalData(null)}
        />
      )}
    </div>
  );
}
