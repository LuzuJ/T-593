import { useMemo } from 'react';
import { ZoomIn, Loader, MapPin } from 'lucide-react';
import { PROVINCIAS_DATA } from '../data/geo_data';

// Colores por región natural del Ecuador
const REGION_STYLES: Record<string, { fill: string; label: string }> = {
  costa:   { fill: '#34d399', label: 'Costa' },
  sierra:  { fill: '#60a5fa', label: 'Sierra' },
  oriente: { fill: '#c084fc', label: 'Oriente' },
  insular: { fill: '#38bdf8', label: 'Insular' },
};

function normStr(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getProvRegion(name: string): 'costa' | 'sierra' | 'oriente' | 'insular' {
  const n = normStr(name);
  if (['guayas', 'el oro', 'esmeraldas', 'los rios', 'manabi', 'santa elena', 'santo domingo'].some(c => n.includes(c))) return 'costa';
  if (['azuay', 'bolivar', 'canar', 'carchi', 'chimborazo', 'cotopaxi', 'imbabura', 'loja', 'pichincha', 'tungurahua'].some(c => n.includes(c))) return 'sierra';
  if (['morona santiago', 'napo', 'orellana', 'pastaza', 'sucumbios', 'zamora chinchipe'].some(c => n.includes(c))) return 'oriente';
  return 'insular';
}

interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface MapExplorerProps {
  navLevel: 'ecuador' | 'provincia' | 'canton';
  provincia: string;
  canton: string;
  loadingMap: boolean;
  activeProvGeo: any;
  activeCantonGeo: any;
  svgViewBox: string;
  svgCantonViewBox: string;
  COLOR_PALETTE: string[];
  onGoToProvincia: (prov: string) => void;
  onGoToCanton: (cant: string) => void;
  onGoToEcuador: () => void;
  onGoToPlanes: (parroquia?: string) => void;
  onMouseMove: (
    e: React.MouseEvent,
    title: string,
    metrics: { label: string; value: string | number }[]
  ) => void;
  onMouseLeave: () => void;
}

export default function MapExplorer({
  navLevel,
  provincia,
  canton,
  loadingMap,
  activeProvGeo,
  COLOR_PALETTE,
  onGoToProvincia,
  onGoToCanton,
  onGoToEcuador,
  onGoToPlanes,
  onMouseMove,
  onMouseLeave,
}: MapExplorerProps) {
  // Cantones únicos de la provincia activa
  const cantonList: string[] = useMemo(() => {
    if (!activeProvGeo) return [];
    if (Array.isArray(activeProvGeo.cantons)) return activeProvGeo.cantons;
    if (Array.isArray(activeProvGeo.parishes)) {
      return Array.from(new Set(activeProvGeo.parishes.map((p: any) => p.canton))).filter(Boolean) as string[];
    }
    return [];
  }, [activeProvGeo]);

  // Centros de gravedad de cada cantón para mostrar UNA etiqueta limpia y legible por cantón en Nivel 2
  const rawCantonCentroids = useMemo(() => {
    if (!activeProvGeo?.parishes) return [];
    const groups: Record<string, { sumX: number; sumY: number; count: number; canton: string }> = {};
    activeProvGeo.parishes.forEach((p: any) => {
      if (!p.canton || p.cx === undefined || p.cy === undefined) return;
      if (!groups[p.canton]) groups[p.canton] = { sumX: 0, sumY: 0, count: 0, canton: p.canton };
      groups[p.canton].sumX += p.cx;
      groups[p.canton].sumY += p.cy;
      groups[p.canton].count += 1;
    });
    return Object.values(groups).map((g) => ({
      canton: g.canton,
      x: g.sumX / g.count,
      y: g.sumY / g.count,
      count: g.count,
    }));
  }, [activeProvGeo]);

  // Cálculo de tamaño de fuente óptimo para Nivel 2 según ancho del ViewBox provincial
  const level2Typography = useMemo(() => {
    const vb = activeProvGeo?.viewBox || '0 0 800 600';
    const parts = vb.split(' ').map(Number);
    const vbWidth = (parts.length === 4 && parts[2] > 0) ? parts[2] : 800;
    const fontSize = Math.max(10, Math.min(24, vbWidth * 0.025));
    const strokeWidth = Math.max(2, fontSize * 0.35);
    return { fontSize, strokeWidth };
  }, [activeProvGeo]);

  // Algoritmo anti-colisión para etiquetas de Cantones (Nivel 2)
  const visibleCantonLabels = useMemo(() => {
    if (rawCantonCentroids.length === 0) return [];
    const fontSize = level2Typography.fontSize;
    const sorted = [...rawCantonCentroids].sort((a, b) => b.count - a.count);
    const placedBoxes: BoundingBox[] = [];
    const result: typeof rawCantonCentroids = [];

    for (const c of sorted) {
      const textLen = (c.canton || '').length;
      const boxW = textLen * fontSize * 0.6 + fontSize;
      const boxH = fontSize * 1.5;
      const minX = c.x - boxW / 2;
      const maxX = c.x + boxW / 2;
      const minY = c.y - boxH / 2;
      const maxY = c.y + boxH / 2;

      let collides = false;
      for (const b of placedBoxes) {
        const noOverlap = maxX < b.minX || minX > b.maxX || maxY < b.minY || minY > b.maxY;
        if (!noOverlap) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        placedBoxes.push({ minX, maxX, minY, maxY });
        result.push(c);
      }
    }
    return result;
  }, [rawCantonCentroids, level2Typography]);

  // Parroquias del cantón activo (para Nivel 3)
  const cantonParishes = useMemo(() => {
    if (!activeProvGeo || !activeProvGeo.parishes || canton === 'TODOS') return [];
    return activeProvGeo.parishes.filter((p: any) => normStr(p.canton) === normStr(canton));
  }, [activeProvGeo, canton]);

  // ViewBox dinámico y tamaño de tipografía del cantón (Nivel 3)
  const { cantonViewBox, level3Typography } = useMemo(() => {
    if (cantonParishes.length === 0) {
      return {
        cantonViewBox: activeProvGeo?.viewBox || '0 0 800 600',
        level3Typography: { fontSize: 12, strokeWidth: 3 },
      };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cantonParishes.forEach((p: any) => {
      const pxMin = p.min_x ?? p.cx;
      const pxMax = p.max_x ?? p.cx;
      const pyMin = p.min_y ?? p.cy;
      const pyMax = p.max_y ?? p.cy;
      if (pxMin < minX) minX = pxMin;
      if (pxMax > maxX) maxX = pxMax;
      if (pyMin < minY) minY = pyMin;
      if (pyMax > maxY) maxY = pyMax;
    });
    const w = maxX - minX || 200;
    const h = maxY - minY || 200;
    const pad = Math.max(w, h) * 0.12;
    const viewBox = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;

    const effectiveWidth = w + pad * 2;
    const fontSize = Math.max(6, Math.min(16, effectiveWidth * 0.024));
    const strokeWidth = Math.max(1.8, fontSize * 0.32);

    return {
      cantonViewBox: viewBox,
      level3Typography: { fontSize, strokeWidth },
    };
  }, [cantonParishes, activeProvGeo]);

  // Algoritmo anti-colisión para etiquetas de Parroquias (Nivel 3)
  // Elimina al 100% las superposiciones en áreas urbanas densas
  const visibleParishLabels = useMemo(() => {
    if (cantonParishes.length === 0) return [];
    const fontSize = level3Typography.fontSize;

    // Priorizar parroquias por área del polígono (las más grandes tienen prioridad visual)
    const sorted = [...cantonParishes]
      .filter((p: any) => p.cx !== undefined && p.cy !== undefined && p.displayName)
      .map((p: any) => {
        const w = (p.max_x ?? p.cx) - (p.min_x ?? p.cx);
        const h = (p.max_y ?? p.cy) - (p.min_y ?? p.cy);
        const area = (w || 10) * (h || 10);
        return { ...p, area };
      })
      .sort((a, b) => b.area - a.area);

    const placedBoxes: BoundingBox[] = [];
    const result: any[] = [];

    for (const p of sorted) {
      const textLen = (p.displayName || '').length;
      // Dimensiones estimadas del texto con margen de seguridad
      const boxW = textLen * fontSize * 0.62 + fontSize * 1.2;
      const boxH = fontSize * 1.6;
      const minX = p.cx - boxW / 2;
      const maxX = p.cx + boxW / 2;
      const minY = p.cy - boxH / 2;
      const maxY = p.cy + boxH / 2;

      let collides = false;
      for (const b of placedBoxes) {
        const noOverlap = maxX < b.minX || minX > b.maxX || maxY < b.minY || minY > b.maxY;
        if (!noOverlap) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        placedBoxes.push({ minX, maxX, minY, maxY });
        result.push(p);
      }
    }

    return result;
  }, [cantonParishes, level3Typography]);

  // Asignar color por cantón
  const getCantonColor = (cantName: string) => {
    const idx = cantonList.findIndex((c) => normStr(c) === normStr(cantName));
    return COLOR_PALETTE[(idx >= 0 ? idx : 0) % COLOR_PALETTE.length];
  };

  return (
    <section className="lg:col-span-8 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl overflow-hidden shadow-md flex flex-col min-h-[620px]">
      {/* Banner de Nivel de Navegación */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm md:text-base font-bold uppercase tracking-wider shadow-sm">
        <span className="flex items-center gap-2">
          <ZoomIn className="h-5 w-5 text-sky-200" />
          {navLevel === 'ecuador' && 'Nivel 1: Mapa Territorial de Ecuador'}
          {navLevel === 'provincia' && `Nivel 2: Cantones de ${provincia}`}
          {navLevel === 'canton' && `Nivel 3: Parroquias de ${canton}`}
        </span>
        {navLevel !== 'ecuador' && (
          <button
            onClick={() => {
              if (navLevel === 'canton') onGoToProvincia(provincia);
              else onGoToEcuador();
            }}
            className="text-xs md:text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition font-bold shadow-sm min-h-[36px]"
          >
            ← Zoom Atrás
          </button>
        )}
      </div>

      {/* Renderizado Vectorial Delimitado y Limpio */}
      <div className="flex-1 bg-slate-50/60 p-5 flex items-center justify-center relative min-h-[550px]">
        {/* Insignia Flotante de Instrucción */}
        <div className="absolute top-4 left-5 z-10 bg-white/95 border border-slate-200/90 text-slate-800 text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-sm flex items-center gap-2.5 backdrop-blur-md pointer-events-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
          {navLevel === 'ecuador' && <span>Seleccione una provincia en el mapa para explorar</span>}
          {navLevel === 'provincia' && <span>Haga clic en un cantón para ver sus parroquias y candidatos</span>}
          {navLevel === 'canton' && <span>Haga clic o pase el cursor sobre cualquier parroquia para ver detalles</span>}
        </div>

        {/* 1. NIVEL PROVINCIAS (ECUADOR GENERAL) */}
        {navLevel === 'ecuador' && (
          <svg
            viewBox="380 -5 425 315"
            className="w-full max-h-[600px] select-none transition-all duration-300 drop-shadow-sm"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Mapa interactivo de Ecuador dividido por provincias. Haga clic en una provincia para explorar sus cantones."
          >
            {/* Marco Inset de Galápagos */}
            <rect
              x="385"
              y="65"
              width="105"
              height="100"
              rx="8"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
            <text
              x="437"
              y="77"
              textAnchor="middle"
              className="text-[6px] font-bold fill-slate-500 uppercase tracking-widest pointer-events-none select-none"
            >
              Región Insular
            </text>

            {PROVINCIAS_DATA.map((prov) => {
              const region = getProvRegion(prov.name);
              const fillColor = REGION_STYLES[region].fill;
              return (
                <g
                  key={prov.id}
                  className="cursor-pointer group"
                  onClick={() => onGoToProvincia(prov.name)}
                  onMouseMove={(e) => onMouseMove(e, prov.displayName, [
                    ...prov.metrics,
                    { label: 'Región', value: REGION_STYLES[region].label },
                  ])}
                  onMouseLeave={onMouseLeave}
                >
                  <title>{prov.displayName} — Clic para explorar</title>
                  {prov.isGalapagos ? (
                    <g transform="translate(380, 0)">
                      <path
                        d={prov.d}
                        id={prov.id}
                        fill={fillColor}
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        className="transition-colors duration-150 group-hover:fill-[#1e3a5f]"
                      />
                    </g>
                  ) : (
                    <path
                      d={prov.d}
                      id={prov.id}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      className="transition-colors duration-150 group-hover:fill-[#1e3a5f]"
                    />
                  )}
                </g>
              );
            })}

            {/* Etiquetas de provincias con alto contraste */}
            {PROVINCIAS_DATA.filter((p) => !p.isGalapagos).map((prov) => (
              <text
                key={`lbl-${prov.id}`}
                x={prov.labelPos.x}
                y={prov.labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="5.2"
                fontWeight="800"
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="2.2"
                paintOrder="stroke"
                className="pointer-events-none select-none uppercase tracking-tight"
              >
                {prov.displayName}
              </text>
            ))}
          </svg>
        )}

        {/* 2. NIVEL CANTONES (PROVINCIA ACTIVA) */}
        {navLevel === 'provincia' && (
          <>
            {loadingMap ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="font-bold text-base">Cargando cartografía cantonal de {provincia}...</p>
              </div>
            ) : activeProvGeo && activeProvGeo.parishes && activeProvGeo.parishes.length > 0 ? (
              <svg
                viewBox={activeProvGeo.viewBox || '0 0 800 600'}
                className="w-full max-h-[600px] select-none transition-all duration-300 drop-shadow-sm"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={`Mapa de cantones de la provincia de ${provincia}`}
              >
                {/* Polígonos de parroquias coloreadas por cantón */}
                {activeProvGeo.parishes.map((parish: any, idx: number) => {
                  const color = getCantonColor(parish.canton);
                  return (
                    <g
                      key={parish.id || idx}
                      className="cursor-pointer group"
                      onClick={() => onGoToCanton(parish.canton)}
                      onMouseMove={(e) => onMouseMove(e, `Cantón ${parish.canton}`, [
                        { label: 'Cantón', value: parish.canton },
                        { label: 'Provincia', value: provincia },
                        { label: 'Parroquia', value: parish.displayName },
                      ])}
                      onMouseLeave={onMouseLeave}
                    >
                      <title>Cantón {parish.canton} — Parroquia {parish.displayName} (Clic para explorar)</title>
                      <path
                        d={parish.d}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="0.9"
                        className="transition-colors duration-150 group-hover:fill-[#1e3a5f]"
                      />
                    </g>
                  );
                })}

                {/* Etiquetas de Cantones con algoritmo anti-colisión */}
                {visibleCantonLabels.map((c) => (
                  <text
                    key={`canton-lbl-${c.canton}`}
                    x={c.x}
                    y={c.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={level2Typography.fontSize}
                    fontWeight="800"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth={level2Typography.strokeWidth}
                    paintOrder="stroke"
                    className="pointer-events-none select-none uppercase tracking-tight"
                  >
                    {c.canton}
                  </text>
                ))}
              </svg>
            ) : (
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-700 font-bold text-base">Cartografía provincial de {provincia} lista.</p>
                <button
                  onClick={() => onGoToPlanes()}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
                >
                  Ver planes de {provincia}
                </button>
              </div>
            )}
          </>
        )}

        {/* 3. NIVEL PARROQUIAS (CANTÓN ACTIVO) */}
        {navLevel === 'canton' && (
          <>
            {cantonParishes.length > 0 ? (
              <svg
                viewBox={cantonViewBox}
                className="w-full max-h-[600px] select-none transition-all duration-300 drop-shadow-sm"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={`Mapa de parroquias del cantón ${canton}`}
              >
                {/* Polígonos interactivos de todas las parroquias */}
                {cantonParishes.map((parish: any, idx: number) => {
                  const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                  return (
                    <g
                      key={parish.id || idx}
                      className="cursor-pointer group"
                      onClick={() => onGoToPlanes(parish.displayName)}
                      onMouseMove={(e) => onMouseMove(e, parish.displayName, [
                        { label: 'Parroquia', value: parish.displayName },
                        { label: 'Cantón', value: canton },
                        { label: 'Provincia', value: provincia },
                      ])}
                      onMouseLeave={onMouseLeave}
                    >
                      <title>{parish.displayName} — Clic para ver propuestas</title>
                      <path
                        d={parish.d}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                        className="transition-colors duration-150 group-hover:fill-[#1e3a5f]"
                      />
                    </g>
                  );
                })}

                {/* Etiquetas de parroquias con Algoritmo Anti-Colisión (Cero superposición) */}
                {visibleParishLabels.map((parish: any) => (
                  <text
                    key={`parish-lbl-${parish.id || parish.displayName}`}
                    x={parish.cx}
                    y={parish.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={level3Typography.fontSize}
                    fontWeight="800"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth={level3Typography.strokeWidth}
                    paintOrder="stroke"
                    className="pointer-events-none select-none uppercase tracking-tight"
                  >
                    {parish.displayName}
                  </text>
                ))}
              </svg>
            ) : (
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-700 font-bold text-base">Mostrando planes de {canton}.</p>
                <button
                  onClick={() => onGoToPlanes()}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
                >
                  Ver planes de este cantón
                </button>
              </div>
            )}
          </>
        )}

        {/* Leyenda interactiva */}
        <div className="absolute bottom-4 left-5 text-xs sm:text-sm text-slate-800 bg-white/95 border border-slate-200/90 p-4 rounded-xl shadow-md flex flex-col gap-2.5 backdrop-blur-md">
          {navLevel === 'ecuador' ? (
            <>
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5">Regiones Naturales</span>
              {Object.entries(REGION_STYLES).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: val.fill }}></span>
                  <span className="font-semibold text-slate-700">{val.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="w-4 h-4 rounded bg-[#1e3a5f]"></span>
                <span className="font-medium text-slate-500">Zona activa (hover)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 border border-slate-300"></span>
                <span className="font-semibold text-slate-700">
                  {navLevel === 'provincia' ? 'Cantones de la Provincia' : 'Parroquias del Cantón'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-[#1e3a5f]"></span>
                <span className="font-medium text-slate-500">Zona activa (hover)</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
