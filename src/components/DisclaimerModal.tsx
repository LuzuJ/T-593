import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, FileText, AlertTriangle, Scale } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

const STORAGE_KEY = 'hackaton_electoral_disclaimer_accepted_v1';

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      setBannerVisible(true);
    }
    onAccept();
  }, [onAccept]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setBannerVisible(false);
    setIsOpen(false);
    onAccept();
  };

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  if (!isOpen && !bannerVisible) return null;

  if (!isOpen && bannerVisible) {
    return (
      <div className="bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
          <div className="flex items-start sm:items-center gap-2">
            <Scale className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-slate-100 leading-snug">
              <strong className="font-bold text-white">Herramienta cívica independiente:</strong> los planes provienen del repositorio público del CNE y el análisis es automatizado.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-3 py-1.5 rounded-lg border border-slate-600 hover:bg-slate-800 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Aviso legal
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full text-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Clara */}
        <div className="bg-slate-50 p-6 sm:p-7 border-b border-slate-200 flex items-center gap-4 shrink-0">
          <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Scale className="h-7 w-7" />
          </div>
          <div>
            <span className="bg-amber-100 text-amber-900 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-amber-200 inline-block mb-1">
              Aviso Legal Obligatorio
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              Descargo de Responsabilidad y Términos de Uso
            </h2>
          </div>
        </div>

        {/* Contenido scrolleable claro y nítido */}
        <div className="p-6 sm:p-7 space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed overflow-y-auto flex-1 scroll-smooth bg-white">
          {/* Cláusula 1 */}
          <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200/90 flex items-start gap-3.5 shadow-2xs">
            <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                1. Información de Acceso Público Oficial
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Los nombres, las listas y los PDF se consultan en el repositorio público del <strong>Consejo Nacional Electoral (CNE)</strong>. Esta página no pertenece al CNE y no guarda una copia propia del plan.
              </p>
            </div>
          </div>

          {/* Cláusula 2 */}
          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/90 flex items-start gap-3.5 shadow-2xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                2. Análisis Automatizado y Fines Exclusivamente Cívicos
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                La muestra de frases usa la misma lista de palabras para todos los partidos. No interviene un modelo de inteligencia artificial ni una persona que califique a un candidato. No es dictamen, ranking ni lectura completa del PDF.
              </p>
            </div>
          </div>

          {/* Cláusula 3 */}
          <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200/90 flex items-start gap-3.5 shadow-2xs">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                3. Comprueba la página antes de citar
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Antes de citar una frase, abre la página del PDF. Una captura de los conteos no demuestra que un plan sea mejor o peor que otro. La decisión de voto es de quien lee.
              </p>
            </div>
          </div>

          {/* Cláusula 4 */}
          <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200/90 flex items-start gap-3.5 shadow-2xs">
            <Scale className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                4. Si compartes una captura
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Incluye la lista y la página del PDF. La muestra puede omitir temas que sí están más adelante en el documento.
              </p>
            </div>
          </div>

          {/* Cláusula 5 */}
          <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200/90 flex items-start gap-3.5 shadow-2xs">
            <FileText className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                5. Los planes no son de esta página
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Los planes siguen siendo documentos del CNE y de quienes los presentaron. Esta página no los relicencia ni se atribuye su autoría. Si compartes una frase, cita la lista y la página del PDF.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Claro con Botones */}
        <div className="bg-slate-50 p-5 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-end items-center shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleAccept}
              className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transform active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Entendido y Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
