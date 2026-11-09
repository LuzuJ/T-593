import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, Download, Loader2, AlertCircle } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FilaPlan, titulo } from '../utils/catalogoPlanes';

GlobalWorkerOptions.workerSrc = workerUrl;

interface VisorPlanProps {
  fila: FilaPlan;
  paginaInicial?: number;
  onCerrar: () => void;
}

function urlProxy(fila: FilaPlan): string | null {
  const proceso = Number(fila.proceso);
  const formulario = Number(fila.cod_formulario);
  const plan = Number(fila.cod_plan);
  if ([proceso, formulario, plan].every((valor) => Number.isInteger(valor) && valor > 0)) {
    return `/cne-plan/${proceso}/${formulario}/${plan}`;
  }
  if (/^\/planes\/[A-Za-z0-9._ -]+\.pdf$/.test(fila.url_plan)) return fila.url_plan;
  return null;
}

function urlOficialCne(fila: FilaPlan): string {
  if (fila.url_plan && fila.url_plan.startsWith('http')) return fila.url_plan;
  const proceso = Number(fila.proceso);
  const formulario = Number(fila.cod_formulario);
  const plan = Number(fila.cod_plan);
  if ([proceso, formulario, plan].every((valor) => Number.isInteger(valor) && valor > 0)) {
    return `https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/${proceso}/${formulario}/${plan}`;
  }
  return fila.url_plan || '';
}

function srcOficial(fila: FilaPlan, paginaInicial?: number): string | null {
  const proceso = Number(fila.proceso);
  const formulario = Number(fila.cod_formulario);
  const plan = Number(fila.cod_plan);
  const pagina = Number(paginaInicial);
  const ancla = Number.isInteger(pagina) && pagina > 0 && pagina < 500 ? `#page=${pagina}&zoom=page-width` : '#zoom=page-width';
  if ([proceso, formulario, plan].every((valor) => Number.isInteger(valor) && valor > 0)) {
    return `/cne-plan/${proceso}/${formulario}/${plan}${ancla}`;
  }
  if (/^\/planes\/[A-Za-z0-9._ -]+\.pdf$/.test(fila.url_plan)) return `${fila.url_plan}${ancla}`;
  return null;
}

export default function VisorPlan({ fila, paginaInicial = 1, onCerrar }: VisorPlanProps) {
  const proxySrc = urlProxy(fila);
  const cneUrl = urlOficialCne(fila);
  const iframeSrc = srcOficial(fila, paginaInicial);

  // Por defecto en computadoras (>= 768px) usamos el visor nativo con scroll continuo.
  // En móviles usamos el visor adaptado que no crashea en Android/iOS.
  const [modo, setModo] = useState<'continuo' | 'paginado'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return 'continuo';
    }
    return 'paginado';
  });

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [paginaActual, setPaginaActual] = useState<number>(paginaInicial || 1);
  const [cargandoPdf, setCargandoPdf] = useState<boolean>(true);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Cargar el documento PDF vía PDF.js para renderizado en Canvas cuando está en modo paginado (celulares)
  useEffect(() => {
    if (modo !== 'paginado') return;
    let cancelado = false;
    setCargandoPdf(true);
    setErrorPdf(null);

    const fuente = proxySrc || cneUrl;
    if (!fuente) {
      setErrorPdf('No se encontró la dirección del PDF para este candidato.');
      setCargandoPdf(false);
      return;
    }

    const cargar = async () => {
      try {
        const loadingTask = getDocument({
          url: fuente,
          withCredentials: false,
        });
        const doc = await loadingTask.promise;
        if (cancelado) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPaginaActual(Math.min(Math.max(1, paginaInicial || 1), doc.numPages));
        setCargandoPdf(false);
      } catch (err: any) {
        if (cancelado) return;
        console.warn('Fallo renderizado canvas de PDF:', err);
        setErrorPdf('No se pudo previsualizar el PDF en este modo. Puedes abrirlo directamente con el botón oficial.');
        setCargandoPdf(false);
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [proxySrc, cneUrl, paginaInicial, modo]);

  // Renderizar la página actual en el Canvas
  useEffect(() => {
    if (modo !== 'paginado' || !pdfDoc || !canvasRef.current) return;

    let cancelado = false;
    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(paginaActual);
        if (cancelado || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const parentWidth = canvas.parentElement?.clientWidth || window.innerWidth;
        const viewportUnscaled = page.getViewport({ scale: 1 });
        const scale = Math.min(2.0, (parentWidth - 32) / viewportUnscaled.width || 1.2);
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error renderizando página PDF:', err);
        }
      }
    };

    renderPage();

    return () => {
      cancelado = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, paginaActual, modo]);

  const cambiarPagina = (delta: number) => {
    setPaginaActual((prev) => Math.min(Math.max(1, prev + delta), numPages || 1));
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white w-full sm:max-w-5xl h-[100dvh] sm:h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Cabecera del Visor */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                Plan de Trabajo CNE
              </span>
              <span className="text-xs text-slate-500 font-semibold truncate hidden sm:inline">
                {titulo(fila.canton || fila.provincia)} · Lista {fila.lista}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
              {titulo(fila.candidato)}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle de Modo: Scroll Continuo vs Paginado */}
            <div className="hidden sm:flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setModo('continuo')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  modo === 'continuo' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
                title="Desplazamiento continuo vertical con rueda de ratón"
              >
                Scroll continuo
              </button>
              <button
                type="button"
                onClick={() => setModo('paginado')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  modo === 'paginado' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
                title="Vista página por página"
              >
                Paginado
              </button>
            </div>

            {cneUrl && (
              <a
                href={cneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                title="Abrir el documento original en una pestaña nueva o visor nativo"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Abrir PDF Oficial</span>
                <span className="sm:hidden">Abrir PDF</span>
              </a>
            )}

            <button
              type="button"
              onClick={onCerrar}
              className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
              aria-label="Cerrar visor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Controles de Página (Solo en modo paginado) */}
        {modo === 'paginado' && numPages > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => cambiarPagina(-1)}
                disabled={paginaActual <= 1}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <span className="px-2 font-bold text-slate-700">
                Pág. {paginaActual} de {numPages}
              </span>

              <button
                type="button"
                onClick={() => cambiarPagina(1)}
                disabled={paginaActual >= numPages}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {cneUrl && (
              <a
                href={cneUrl}
                download={`${fila.candidato.replace(/\s+/g, '_')}_Plan_Trabajo.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-semibold flex items-center gap-1 transition text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
            )}
          </div>
        )}

        {/* Área de Visualización: Modo Continuo (iframe nativo con scroll vertical libre) */}
        {modo === 'continuo' && iframeSrc && (
          <iframe
            key={iframeSrc}
            title={`Plan de ${titulo(fila.candidato)}`}
            src={iframeSrc}
            referrerPolicy="no-referrer"
            className="flex-1 w-full bg-slate-100 border-0"
          />
        )}

        {/* Área de Visualización: Modo Paginado (Canvas para móviles o modo alternativo) */}
        {modo === 'paginado' && (
          <div className="flex-1 bg-slate-100/90 overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-start min-h-0">
            {cargandoPdf && (
              <div className="my-auto flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm font-bold text-slate-700">Cargando páginas del PDF oficial…</p>
                <p className="text-xs text-slate-400 mt-1">Descargando desde el repositorio del CNE</p>
              </div>
            )}

            {errorPdf && !cargandoPdf && (
              <div className="my-auto max-w-md bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-sm">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Visualización directa</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{errorPdf}</p>
                </div>
                {cneUrl && (
                  <a
                    href={cneUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir PDF Oficial en el Teléfono
                  </a>
                )}
              </div>
            )}

            {!cargandoPdf && !errorPdf && (
              <div className="w-full flex justify-center py-2">
                <canvas
                  ref={canvasRef}
                  className="bg-white shadow-lg rounded-xl max-w-full border border-slate-200"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
