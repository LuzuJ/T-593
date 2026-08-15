import { useState } from 'react';
import {
  FileText, MapPin, Calendar, ChevronDown, ChevronUp, BookOpen, Anchor, CheckCircle2, AlertCircle, XCircle, ArrowUpRight
} from 'lucide-react';
import { Candidato } from '../types/electoral';
import CompetenciaBadge from './CompetenciaBadge';

interface CandidatoCardProps {
  candidato: Candidato;
  onOpenDetail: () => void;
  onSelectAsAnchor?: () => void;
}

const LISTA_GRADIENTS: Record<string, string> = {
  '1': 'from-blue-600 to-cyan-600',
  '2': 'from-red-600 to-orange-600',
  '3': 'from-emerald-600 to-teal-600',
  '4': 'from-amber-600 to-yellow-600',
  '5': 'from-indigo-600 to-purple-600',
  '6': 'from-pink-600 to-rose-600',
  '7': 'from-sky-600 to-blue-700',
  '8': 'from-violet-600 to-fuchsia-600',
};

function getListaGradient(lista: string): string {
  return LISTA_GRADIENTS[lista] || 'from-blue-600 to-indigo-700';
}

export default function CandidatoCard({ candidato, onOpenDetail, onSelectAsAnchor }: CandidatoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const promesas = candidato.analisis.promesas_clasificadas || [];
  const countViables = promesas.filter((p) => p.viable === 'Sí').length;
  const countParciales = promesas.filter((p) => p.viable === 'Parcial').length;
  const countNo = promesas.filter((p) => p.viable === 'No').length;
  const totalPromesas = promesas.length || 1;
  const pctViable = Math.round((countViables / totalPromesas) * 100);

  const gradientClass = getListaGradient(candidato.lista);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-xl shadow-sm flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1 relative">
      {/* Barra superior con gradiente de lista */}
      <div className={`h-2.5 w-full bg-gradient-to-r ${gradientClass}`} />

      <div className="p-6 flex-1 flex flex-col">
        {/* Cabecera del Candidato con Monograma Grande */}
        <div className="flex items-start gap-4">
          <div
            className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center text-2xl font-extrabold shadow-md shrink-0 ring-2 ring-white select-none`}
          >
            {candidato.nombre.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="bg-slate-900 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-xs">
                Lista {candidato.lista}
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-slate-200">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                {candidato.fecha_inscripcion ? candidato.fecha_inscripcion.split(',')[0] : 'Reg. Oficial CNE'}
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
              {candidato.nombre}
            </h3>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">{candidato.partido_politico}</p>
          </div>

          <span
            className="bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 shrink-0 select-none shadow-2xs"
            title="Total de páginas del plan de trabajo oficial"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            {candidato.analisis.paginas_total} págs
          </span>
        </div>

        {/* Ubicación territorial */}
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium mt-4 pb-3.5 border-b border-slate-100">
          <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong className="text-slate-800 font-bold">{candidato.jurisdiccion.provincia}</strong> — {candidato.jurisdiccion.canton} ({candidato.jurisdiccion.dignidad})
          </span>
        </div>

        {/* Resumen de Viabilidad COOTAD */}
        <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2.5">
            <span className="text-sm text-slate-700 font-bold flex items-center gap-1.5">
              Evaluación Jurídica COOTAD:
            </span>
            <CompetenciaBadge competencia={candidato.analisis.clasificacion_competencia} />
          </div>

          {/* Barra de desglose de promesas */}
          {promesas.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200/80">
              <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                <span>Promesas analizadas ({promesas.length}):</span>
                <span className="text-emerald-700">{pctViable}% viables</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                <div style={{ width: `${(countViables / totalPromesas) * 100}%` }} className="bg-emerald-500 h-full" title={`${countViables} viables`} />
                <div style={{ width: `${(countParciales / totalPromesas) * 100}%` }} className="bg-amber-400 h-full" title={`${countParciales} concurrentes`} />
                <div style={{ width: `${(countNo / totalPromesas) * 100}%` }} className="bg-rose-500 h-full" title={`${countNo} fuera de competencia`} />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> {countViables} Viables</span>
                <span className="flex items-center gap-1 text-amber-800"><AlertCircle className="h-3.5 w-3.5" /> {countParciales} Parcial</span>
                <span className="flex items-center gap-1 text-rose-800"><XCircle className="h-3.5 w-3.5" /> {countNo} Fuera</span>
              </div>
            </div>
          )}
        </div>

        {/* Abstract / Resumen Ejecutivo - Tipografía 16px para lectura cómoda */}
        <div className="mt-4 bg-white p-4 rounded-xl border border-slate-200 text-sm md:text-base text-slate-800 leading-relaxed font-normal shadow-2xs">
          <p className={expanded ? '' : 'line-clamp-3'}>{candidato.analisis.resumen_abstract}</p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-800 font-bold mt-2.5 flex items-center gap-1 text-xs sm:text-sm transition-colors"
          >
            {expanded ? (
              <>
                Mostrar menos <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Leer resumen completo <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Keywords */}
        <div className="mt-3.5 flex flex-wrap gap-2 items-center">
          {candidato.analisis.palabras_clave.slice(0, 3).map((kw) => (
            <span
              key={kw}
              className="text-xs font-semibold bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200"
            >
              #{kw}
            </span>
          ))}
          {candidato.analisis.palabras_clave.length > 3 && (
            <span className="text-xs font-bold text-slate-500">
              +{candidato.analisis.palabras_clave.length - 3} más
            </span>
          )}
        </div>
      </div>

      {/* Acciones de la Tarjeta */}
      <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
        <button
          onClick={onOpenDetail}
          className="w-full bg-slate-900 hover:bg-blue-600 text-white py-3 px-5 rounded-xl text-sm md:text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm min-h-[48px] group/btn"
        >
          <BookOpen className="h-5 w-5 text-sky-300 group-hover/btn:text-white transition-colors" />
          <span>Ficha Técnica y Evaluación Jurídica</span>
          <ArrowUpRight className="h-5 w-5 opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
        </button>

        {onSelectAsAnchor && (
          <button
            onClick={onSelectAsAnchor}
            className="w-full bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-900 border border-blue-200 hover:border-blue-300 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 min-h-[42px] shadow-2xs"
          >
            <Anchor className="h-4 w-4 text-blue-600" />
            Usar como Candidato Ancla de Comparación
          </button>
        )}
      </div>
    </div>
  );
}
