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

// Componente para renderizar cada página del PDF en flujo continuo para celulares (sin iframes que causan error 10369)
function PaginaPdf({
  pdfDoc,
  pageNumber,
  parentWidth,
}: {
  pdfDoc: any;
  pageNumber: number;
  parentWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [cargada, setCargada] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
        }
      },
      { rootMargin: '350px 0px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !pdfDoc || !canvasRef.current) return;
    let cancelado = false;
    let renderTask: any = null;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelado || !canvasRef.current) return;

        const viewportUnscaled = page.getViewport({ scale: 1 });
        const scale = Math.min(2.0, Math.max(0.6, (parentWidth - 32) / (viewportUnscaled.width || 600)));
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
        if (!cancelado) setCargada(true);
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn(`Error renderizando pág ${pageNumber}:`, e);
        }
      }
    };

    render();

    return () => {
      cancelado = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [visible, pdfDoc, pageNumber, parentWidth]);

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-center bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="w-full px-3 py-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
        <span>Página {pageNumber}</span>
      </div>
      <div className="p-2 flex items-center justify-center min-h-[220px] w-full relative">
        <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" />
        {!cargada && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold bg-slate-50/60">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Cargando pág. {pageNumber}…</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisorPlan({ fila, paginaInicial = 1, onCerrar }: VisorPlanProps) {
  const proxySrc = urlProxy(fila);
  const cneUrl = urlOficialCne(fila);
  const iframeSrc = srcOficial(fila, paginaInicial);

  const [esMovil, setEsMovil] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const check = () => setEsMovil(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Por defecto usamos scroll continuo.
  const [modo, setModo] = useState<'continuo' | 'paginado'>('continuo');

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [paginaActual, setPaginaActual] = useState<number>(paginaInicial || 1);
  const [cargandoPdf, setCargandoPdf] = useState<boolean>(true);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // En celulares siempre usamos el motor Canvas (scroll continuo o paginado) para evitar el error de iframes en Android
  const debeUsarCanvas = modo === 'paginado' || esMovil;

  // Cargar el documento PDF vía PDF.js
  useEffect(() => {
    if (!debeUsarCanvas) return;
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
  }, [proxySrc, cneUrl, paginaInicial, debeUsarCanvas]);

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
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 bg-white shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {/* Fila principal */}
          <div className="flex items-center justify-between gap-3">
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

            {/* Desktop: Controles a la derecha */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setModo('continuo')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    modo === 'continuo' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                  title="Desplazamiento continuo vertical con rueda de ratón o táctil"
                >
                  Scroll continuo
                </button>
                <button
                  type="button"
                  onClick={() => setModo('paginado')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
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
                  <span>Abrir PDF Oficial</span>
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

            {/* Móvil: Botón de cierre compacto */}
            <button
              type="button"
              onClick={onCerrar}
              className="sm:hidden h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Cerrar visor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Fila secundaria en Celular: Selector de Modo (Scroll Continuo / Paginado) y Botón PDF */}
          <div className="flex sm:hidden items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setModo('continuo')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  modo === 'continuo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Scroll continuo
              </button>
              <button
                type="button"
                onClick={() => setModo('paginado')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  modo === 'paginado' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Paginado
              </button>
            </div>

            {cneUrl && (
              <a
                href={cneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Abrir PDF</span>
              </a>
            )}
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

        {/* Caso 1: Computadora en Modo Continuo (iframe nativo con scroll y zoom por rueda de ratón) */}
        {modo === 'continuo' && !esMovil && iframeSrc && (
          <iframe
            key={iframeSrc}
            title={`Plan de ${titulo(fila.candidato)}`}
            src={iframeSrc}
            referrerPolicy="no-referrer"
            className="flex-1 w-full bg-slate-100 border-0"
          />
        )}

        {/* Caso 2: Celular en Modo Continuo (flujo vertical nativo de páginas con Canvas, sin iframes) */}
        {modo === 'continuo' && esMovil && (
          <div className="flex-1 bg-slate-100/90 overflow-y-auto p-2.5 sm:p-4 min-h-0">
            {cargandoPdf && (
              <div className="my-auto flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm font-bold text-slate-700">Cargando PDF oficial…</p>
                <p className="text-xs text-slate-400 mt-1">Preparando páginas para desplazamiento vertical</p>
              </div>
            )}

            {errorPdf && !cargandoPdf && (
              <div className="my-auto max-w-md bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-sm mx-auto">
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

            {!cargandoPdf && !errorPdf && numPages > 0 && (
              <div className="flex flex-col items-center gap-3 max-w-2xl mx-auto pb-8">
                {Array.from({ length: numPages }, (_, index) => (
                  <PaginaPdf
                    key={index + 1}
                    pdfDoc={pdfDoc}
                    pageNumber={index + 1}
                    parentWidth={typeof window !== 'undefined' ? window.innerWidth : 360}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Caso 3: Modo Paginado (Canvas con control manual de páginas) */}
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
