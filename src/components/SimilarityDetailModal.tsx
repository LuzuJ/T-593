import { useEffect, useRef } from 'react';
import {
  X, CheckCircle, Check, ArrowRight,
} from 'lucide-react';
import { Candidato, SimilitudCandidato } from '../types/electoral';

interface Props {
  candA: Candidato;
  candB: Candidato;
  sim: SimilitudCandidato;
  onClose: () => void;
}

export default function SimilarityDetailModal({ candA, candB, sim, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Cerrar con ESC + focus trap + body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      const closeBtn = modalRef.current?.querySelector<HTMLElement>('button');
      closeBtn?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Comparativa entre ${candA.nombre} y ${candB.nombre}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col my-auto ring-1 ring-slate-900/5 modal-content"
      >
        {/* Header Modal */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-t-2xl flex justify-between items-center">
          <div>
            <span className="bg-blue-600 text-white text-xs sm:text-sm font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              Análisis Comparativo Cruzado
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>{candA.nombre}</span>
              <span className="text-blue-400 text-base sm:text-lg font-bold">vs</span>
              <span>{candB.nombre}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 border border-blue-400/40 text-blue-200 px-5 py-2.5 rounded-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider block">Coincidencia</span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono">{sim.porcentaje.toFixed(1)}%</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2.5 rounded-full transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8 text-slate-800">
          {/* Coincidencias */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <h3 className="text-base sm:text-lg font-bold text-emerald-950 mb-3.5 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              Puntos de Coincidencia Programática (En qué coinciden)
            </h3>
            {sim.puntos_coincidencia && sim.puntos_coincidencia.length > 0 ? (
              <div className="space-y-3">
                {sim.puntos_coincidencia.map((pt: string, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 font-bold" />
                    <p className="text-sm sm:text-base font-semibold text-slate-900">{pt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-slate-600 italic">No se registraron coincidencias estructurales directas.</p>
            )}
          </div>

          {/* Diferencias */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-base sm:text-lg font-bold text-blue-950 mb-3.5 uppercase tracking-wider flex items-center gap-2">
              <ArrowRight className="h-6 w-6 text-blue-600" />
              Puntos de Divergencia Clave (En qué se diferencian)
            </h3>
            {sim.puntos_diferencia && sim.puntos_diferencia.length > 0 ? (
              <div className="space-y-3">
                {sim.puntos_diferencia.map((pt: string, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs flex items-start gap-3">
                    <ArrowRight className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm sm:text-base font-semibold text-slate-900">{pt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-slate-600 italic">Los planes coinciden en la mayoría de líneas programáticas generales.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-5 sm:p-6 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base px-8 py-3 rounded-xl transition shadow-md min-h-[44px]"
          >
            Cerrar Comparativo
          </button>
        </div>
      </div>
    </div>
  );
}
