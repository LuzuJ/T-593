import { useEffect, useRef } from 'react';
import {
  MapPin, Calendar, X, CheckCircle, AlertTriangle, XCircle,
  BookOpen, FileCheck, Sparkles, Check, Download, Award
} from 'lucide-react';
import { Candidato } from '../types/electoral';
import CompetenciaBadge from './CompetenciaBadge';

interface Props {
  candidato: Candidato;
  onClose: () => void;
}

function getDignidadBadge(dignidad: string) {
  switch (dignidad) {
    case 'Alcalde':
      return { label: 'Alcaldía', bg: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' };
    case 'Prefecto':
      return { label: 'Prefectura', bg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' };
    case 'Concejal':
      return { label: 'Concejalía', bg: 'bg-sky-500/20 text-sky-200 border-sky-400/30' };
    case 'Vocal Junta Parroquial':
      return { label: 'Junta Parroquial', bg: 'bg-amber-500/20 text-amber-200 border-amber-400/30' };
    default:
      return { label: dignidad, bg: 'bg-slate-500/20 text-slate-200 border-slate-400/30' };
  }
}

export default function CandidateDetailModal({ candidato, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const digBadge = getDignidadBadge(candidato.jurisdiccion.dignidad);

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
      aria-label={`Ficha completa de ${candidato.nombre}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col my-auto ring-1 ring-slate-900/5 modal-content"
      >
        {/* Header Modal */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-t-2xl flex justify-between items-start relative">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-inner shrink-0">
              {candidato.nombre.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-blue-600 text-white text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  Lista {candidato.lista}
                </span>
                <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${digBadge.bg}`}>
                  <Award className="h-3.5 w-3.5" />
                  {digBadge.label}
                </span>
                <span className="bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-slate-700">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  Inscripción: {candidato.fecha_inscripcion || 'Registro Oficial CNE'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{candidato.nombre}</h2>
              <p className="text-sm sm:text-base font-semibold text-slate-300 mt-1">{candidato.partido_politico}</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span>{candidato.jurisdiccion.provincia} — {candidato.jurisdiccion.canton} ({candidato.jurisdiccion.dignidad})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2.5 rounded-full transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8 text-slate-800">
          {/* Section 1: Resumen del Plan */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Resumen Ejecutivo del Plan de Trabajo
              </h3>
              {candidato.archivo_pdf && (
                <a
                  href={`/planes/${encodeURIComponent(candidato.archivo_pdf)}`}
                  download={candidato.archivo_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm shrink-0"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF Oficial
                </a>
              )}
            </div>
            <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-normal">
              {candidato.analisis.resumen_abstract}
            </p>
          </div>

          {/* Section 2: Evaluación COOTAD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-emerald-600" />
                Evaluación de Viabilidad Legal COOTAD
              </h3>
              <CompetenciaBadge competencia={candidato.analisis.clasificacion_competencia} />
            </div>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Fundamentación y Alcance Jurídico:
              </p>
              <p className="text-base sm:text-lg text-slate-900 font-medium leading-relaxed">
                "{candidato.analisis.justificacion_competencia}"
              </p>
            </div>
          </div>

          {/* Section 3: Clasificación de Promesas */}
          {candidato.analisis.promesas_clasificadas && candidato.analisis.promesas_clasificadas.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-blue-600" />
                Clasificación de Propuestas y Promesas ({candidato.analisis.promesas_clasificadas.length})
              </h3>
              <div className="space-y-3.5">
                {candidato.analisis.promesas_clasificadas.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 shadow-2xs transition"
                  >
                    <div className="flex-1 space-y-1.5">
                      <p className="text-base sm:text-lg font-bold text-slate-900">{p.promesa}</p>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">{p.justificacion}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
                      {p.viable === 'Sí' && (
                        <span className="bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <Check className="h-4 w-4 text-emerald-700" /> Viable (100%)
                        </span>
                      )}
                      {p.viable === 'Parcial' && (
                        <span className="bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <AlertTriangle className="h-4 w-4 text-amber-700" /> Parcialmente viable
                        </span>
                      )}
                      {p.viable === 'No' && (
                        <span className="bg-rose-100 text-rose-900 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                          <XCircle className="h-4 w-4 text-rose-700" /> Fuera de Alcance
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-500">{p.tipo_competencia}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Temas Disruptivos */}
          {candidato.analisis.temas_disruptivos && candidato.analisis.temas_disruptivos.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="text-base sm:text-lg font-bold text-blue-950 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Propuestas Disruptivas e Innovadoras
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {candidato.analisis.temas_disruptivos.map((t, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm sm:text-base font-semibold text-slate-900">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-5 sm:p-6 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
          {candidato.archivo_pdf ? (
            <a
              href={`/planes/${encodeURIComponent(candidato.archivo_pdf)}`}
              download={candidato.archivo_pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-800 hover:text-blue-700 border border-slate-300 font-bold text-sm px-5 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-2xs"
            >
              <Download className="h-4 w-4 text-blue-600" />
              Descargar Plan Completo ({candidato.analisis.paginas_total} págs PDF)
            </a>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base px-8 py-3 rounded-xl transition shadow-md min-h-[44px]"
          >
            Cerrar Ficha Técnica
          </button>
        </div>
      </div>
    </div>
  );
}
