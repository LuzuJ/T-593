import { useState } from 'react';
import { createPortal } from 'react-dom';
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
    <header className="bg-white/95 border-b border-slate-200/80 py-2 sm:py-2.5 px-3 sm:px-6 shadow-sm sticky top-0 z-30 backdrop-blur-md">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
        {/* Marca y Título Compacto */}
        <div className="flex items-center justify-between gap-3 min-w-0 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg tracking-wider shrink-0 shadow-xs">
              T-593
            </span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                <Compass className="h-5 w-5 text-blue-600 shrink-0 hidden sm:block" />
                <span className="truncate">Observatorio Electoral</span>
                <span className="text-xs font-semibold text-slate-400 hidden lg:inline">· Planes 2027</span>
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCicloInfo(true)}
            className="md:hidden shrink-0 h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition"
            title="Información del proceso electoral 2027"
          >
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>2027</span>
            <Info className="h-3 w-3 text-slate-400" />
          </button>
        </div>

        {/* Buscador Nacional Transversal */}
        {onExplore && (
          <div className="w-full md:flex-1 md:max-w-xl min-w-0">
            <GlobalSearchBar onExplore={onExplore} />
          </div>
        )}

        {/* Controles de la derecha */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCicloInfo(true)}
            className="hidden md:flex shrink-0 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold px-3 rounded-xl items-center gap-1.5 transition"
            title="Alcance de las elecciones 2027"
          >
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Seccionales 2027</span>
            <Info className="h-3 w-3 text-slate-400" />
          </button>

          {(navLevel === 'planes' || explorando) && (
            <button
              onClick={onBackToMap}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm h-9 cursor-pointer shrink-0"
              title="Volver a seleccionar lugar o mapa"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal / Ventana Explicativa del Régimen Electoral del Ecuador montado fuera del header para evitar bugs de backdrop-filter */}
      {showCicloInfo && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowCicloInfo(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Scale className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Régimen Electoral y Marco Legal en Ecuador
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCicloInfo(false)}
                className="text-slate-400 hover:text-slate-800 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed overflow-y-auto pr-1">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
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

            <div className="pt-2 flex justify-end shrink-0 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCicloInfo(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
