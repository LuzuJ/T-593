/**
 * CompetenciaBadge — Badge visual para clasificación de competencia COOTAD
 * Tipografía mejorada y tamaño accesible
 */
export default function CompetenciaBadge({ competencia }: { competencia: string }) {
  if (competencia === 'Competencia exclusiva municipal') {
    return (
      <span className="bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-bold px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
        Exclusiva municipal
      </span>
    );
  }
  if (competencia === 'Competencia concurrente') {
    return (
      <span className="bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold px-3 py-1 rounded-lg border border-amber-300 shadow-2xs inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-600"></span>
        Concurrente
      </span>
    );
  }
  return (
    <span className="bg-rose-100 text-rose-900 text-xs sm:text-sm font-bold px-3 py-1 rounded-lg border border-rose-300 shadow-2xs inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-rose-600"></span>
      Fuera de competencia
    </span>
  );
}
