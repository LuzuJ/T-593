import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, FileText, AlertTriangle, Scale, Lock } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

const STORAGE_KEY = 'hackaton_electoral_disclaimer_accepted_v1';

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasRejected, setHasRejected] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      setIsOpen(true);
    } else {
      onAccept();
    }
  }, [onAccept]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    setHasRejected(false);
    onAccept();
  };

  const handleReject = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsOpen(false);
    setHasRejected(true);
  };

  const handleReopen = () => {
    setHasRejected(false);
    setIsOpen(true);
  };

  // Si rechazó, pantalla bloqueante clara y legible
  if (hasRejected) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center shadow-2xl text-slate-800 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="h-20 w-20 bg-rose-50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center border border-rose-200 shadow-sm">
            <Lock className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Acceso Restringido</h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Para navegar y consultar el análisis de planes de trabajo electorales, es requisito obligatorio aceptar el descargo de responsabilidad legal.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleReopen}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all transform active:scale-95 cursor-pointer"
            >
              Revisar y Aceptar Términos de Uso
            </button>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            Plataforma de Análisis Cívico y Legal Electoral Ecuador
          </p>
        </div>
      </div>
    );
  }

  // Si no está abierto (ya aceptó), no renderizar nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full text-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
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
              onClick={handleReject}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <XCircle className="h-4 w-4 text-slate-500" />
              Rechazar y Salir
            </button>

            <button
              onClick={handleAccept}
              className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transform active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Aceptar y Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
