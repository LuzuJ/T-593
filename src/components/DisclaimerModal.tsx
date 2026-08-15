import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, FileText, AlertTriangle, Scale, Lock, ArrowDownCircle, ChevronDown } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

const STORAGE_KEY = 'hackaton_electoral_disclaimer_accepted_v1';

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasRejected, setHasRejected] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      setIsOpen(true);
    } else {
      onAccept();
    }
  }, [onAccept]);

  // Verificar si el contenido cabe sin necesidad de scroll (pantallas muy grandes)
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const { scrollHeight, clientHeight } = contentRef.current;
      if (scrollHeight <= clientHeight + 10) {
        setHasScrolledToBottom(true);
      }
    }
  }, [isOpen]);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      // Tolerancia de 20px
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const scrollToBottomAction = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleAccept = () => {
    if (!hasScrolledToBottom) return;
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
    setHasScrolledToBottom(false);
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
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="p-6 sm:p-7 space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed overflow-y-auto flex-1 scroll-smooth bg-white"
        >
          {/* Cláusula 1 */}
          <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200/90 flex items-start gap-3.5 shadow-2xs">
            <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                1. Información de Acceso Público Oficial
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Los planes de trabajo y propuestas presentados en este portal han sido recopilados directamente de las fuentes oficiales de dominio público registradas ante el <strong>Consejo Nacional Electoral (CNE)</strong> del Ecuador.
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
                La clasificación competencial y evaluación conforme al <strong>COOTAD</strong> (Código Orgánico de Organización Territorial, Autonomía y Descentralización) es un ejercicio analítico algorítmico asistido por modelos de inteligencia artificial. No constituye dictamen vinculante, auditoría jurídica formal ni postura política institucional.
              </p>
            </div>
          </div>

          {/* Cláusula 3 */}
          <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200/90 flex items-start gap-3.5 shadow-2xs">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                3. Exención Total de Responsabilidad
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Los autores, desarrolladores y entidades vinculadas al desarrollo de esta herramienta <strong>quedan expresamente exentos de toda responsabilidad legal, civil o política</strong> por las interpretaciones, usos o decisiones tomadas a partir de la información aquí visualizada.
              </p>
            </div>
          </div>

          {/* Cláusula 4 */}
          <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200/90 flex items-start gap-3.5 shadow-2xs">
            <Scale className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                4. Responsabilidad Exclusiva sobre Productos Derivados
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Cualquier producto, reporte, análisis, síntesis, gráfico, publicación o contenido derivado que el usuario genere a partir de los datos, herramientas o visualizaciones de esta plataforma es de <strong>responsabilidad neta y exclusiva del usuario</strong> que lo produzca o difunda.
              </p>
            </div>
          </div>

          {/* Cláusula 5 */}
          <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200/90 flex items-start gap-3.5 shadow-2xs">
            <FileText className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold text-sm sm:text-base mb-0.5">
                5. Licencia de Uso: Creative Commons (CC BY-NC-SA 4.0)
              </strong>
              <p className="text-slate-700 text-xs sm:text-sm leading-normal font-normal">
                Esta plataforma y sus análisis de datos abiertos se comparten bajo la licencia <strong>Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional</strong>. Se autoriza su consulta, reutilización no comercial y difusión citando la fuente y manteniendo los mismos términos de apertura cívica.
              </p>
            </div>
          </div>

          {/* Indicador de lectura completada */}
          <div className="pt-2 text-center">
            {hasScrolledToBottom ? (
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-300 animate-in fade-in shadow-2xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Ha leído el documento completo. Puede aceptar para continuar.
              </div>
            ) : (
              <button
                onClick={scrollToBottomAction}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-full border border-amber-300 transition-all cursor-pointer shadow-2xs"
              >
                <ChevronDown className="h-4 w-4 text-amber-600 animate-bounce" />
                Deslice hasta el final para habilitar el botón de aceptación
              </button>
            )}
          </div>
        </div>

        {/* Footer Claro con Botones */}
        <div className="bg-slate-50 p-5 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left font-medium">
            {!hasScrolledToBottom && (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <ArrowDownCircle className="h-4 w-4 shrink-0 text-amber-600" />
                Debe leer hasta el final para aceptar
              </span>
            )}
          </div>

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
              disabled={!hasScrolledToBottom}
              className={`w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-extrabold shadow-sm transition flex items-center justify-center gap-2 ${
                hasScrolledToBottom
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transform active:scale-95'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
              }`}
              title={!hasScrolledToBottom ? 'Deslice hacia abajo para leer todo el descargo' : 'Aceptar términos'}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aceptar Términos y Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
