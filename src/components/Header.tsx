import { Compass, FileText, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  navLevel: 'ecuador' | 'provincia' | 'canton' | 'planes';
  totalCandidatos: number;
  onGoToPlanes: () => void;
  onBackToMap: () => void;
}

export default function Header({
  navLevel,
  totalCandidatos,
  onGoToPlanes,
  onBackToMap,
}: HeaderProps) {
  return (
    <header className="bg-white/95 border-b border-slate-200 py-4 px-4 md:px-8 shadow-sm sticky top-0 z-30 backdrop-blur-md">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3.5">
          <span
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-sm tracking-wider cursor-help select-none"
            title="Transparencia 593 — Plataforma cívica de análisis y comparación de planes electorales de Ecuador (+593)"
          >
            T-593
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Compass className="h-8 w-8 text-blue-600" />
              Observatorio Electoral de Planes de Trabajo
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-0.5">
              Evaluación Jurídica de Competencias COOTAD y Comparativa de Propuestas
            </p>
          </div>
        </div>

        {/* Acceso Rápido */}
        <div className="flex items-center gap-3">
          {navLevel === 'planes' ? (
            <button
              onClick={onBackToMap}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm md:text-base font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-sm min-h-[44px]"
            >
              <ArrowLeft className="h-5 w-5" />
              Volver al Mapa Territorial
            </button>
          ) : (
            <button
              onClick={onGoToPlanes}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm md:text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all transform active:scale-95 min-h-[44px]"
            >
              <FileText className="h-5 w-5" />
              Ver Planes de Trabajo ({totalCandidatos})
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
