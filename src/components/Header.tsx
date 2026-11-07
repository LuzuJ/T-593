import { useState } from 'react';
import { Compass, ArrowLeft, Info, Calendar, X, Scale } from 'lucide-react';
import GlobalSearchBar from './GlobalSearchBar';
import { Sugerencia } from '../utils/catalogoPlanes';

interface HeaderProps {
  navLevel: 'ecuador' | 'provincia' | 'canton' | 'planes';
  explorando?: boolean;
  onBackToMap: () => void;
  onExplore?: (item: Sugerencia) => void;
}

export default function Header({
  navLevel,
  explorando = false,
  onBackToMap,
  onExplore,
}: HeaderProps) {
  const [showCicloInfo, setShowCicloInfo] = useState(false);

  return (
    <header className="bg-white/95 border-b border-slate-200 py-3.5 px-4 md:px-8 shadow-sm sticky top-0 z-30 backdrop-blur-md">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3.5 shrink-0">
          <span
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-sm tracking-wider cursor-help select-none"
            title="Transparencia 593 — Plataforma cívica de análisis y comparación de planes electorales de Ecuador (+593)"
          >
            T-593
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Compass className="h-7 w-7 text-blue-600" />
                Observatorio Electoral de Planes de Trabajo
              </h1>

              {/* Badge Informativo de Régimen y Ciclo Electoral */}
              <button
                type="button"
                onClick={() => setShowCicloInfo(true)}
                className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                title="Haga clic para ver el alcance temporal y legal de las elecciones en Ecuador"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Elecciones Seccionales CNE (2027–2031) — Proceso 140</span>
                <Info className="h-3 w-3 text-slate-400" />
              </button>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Lectura ciudadana de los PDF publicados por el CNE. No es un sitio oficial ni un dictamen jurídico.
            </p>
          </div>
        </div>

        {/* Buscador Nacional Transversal */}
        {onExplore && (
          <div className="w-full lg:max-w-xl">
            <GlobalSearchBar onExplore={onExplore} />
          </div>
        )}

        {/* Acceso Rápido */}
        <div className="flex items-center gap-3 shrink-0">
          {navLevel === 'planes' || explorando ? (
            <button
              onClick={onBackToMap}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm md:text-base font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-sm min-h-[44px] cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
              Volver al Mapa Territorial
            </button>
          ) : null}
        </div>
      </div>

      {/* Modal / Ventana Explicativa del Régimen Electoral del Ecuador */}
      {showCicloInfo && (
        <div
          className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCicloInfo(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-black text-slate-900">
                  Régimen Electoral y Marco Legal en Ecuador
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCicloInfo(false)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                <strong className="text-blue-950 font-bold block mb-1">
                  1. Elecciones Seccionales GADs y CPCCS (Período 2027–2031 — Proceso 140)
                </strong>
                <p>
                  Prefectos, alcaldes, concejales, vocales parroquiales y miembros del CPCCS del proceso electoral 140, período <strong>2027–2031</strong>. El COOTAD y la Constitución describen esas funciones. Esta página solo ayuda a abrir el plan y a ver frases del PDF.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
                <strong className="text-indigo-950 font-bold block mb-1">
                  2. Elecciones Generales Presidenciales y Legislativas (2025)
                </strong>
                <p>
                  Las elecciones generales de 2025 eligieron presidente, vicepresidente y asambleístas. Esas dignidades se leen con la Constitución, no con el COOTAD. Esta herramienta no las califica.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <strong className="text-emerald-950 font-bold block mb-1">
                  3. Qué documento se abre
                </strong>
                <p>
                  El visor pide el PDF al repositorio público del CNE en el momento de la consulta. La muestra de frases usa la misma lista de palabras para todos los partidos. Un PDF escaneado no recibe una nota de cero.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCicloInfo(false)}
                className="bg-slate-900 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
