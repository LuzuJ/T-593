import { useState } from 'react';
import { X } from 'lucide-react';
import { FilaPlan, cargarCatalogo, encontrarPlan, titulo } from '../utils/catalogoPlanes';

interface VisorPlanProps {
  fila: FilaPlan;
  paginaInicial?: number;
  onCerrar: () => void;
}

export function useVisorPlan() {
  const [fila, setFila] = useState<FilaPlan | null>(null);
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  const abrir = async (criterio: {
    nombre: string;
    lista?: string;
    canton?: string;
    provincia?: string;
    dignidad?: string;
    pdfUrl?: string | null;
  }) => {
    setAviso('');
    setCargando(true);
    try {
    const directo = criterio.pdfUrl?.match(/PlanTrabajo\/(\d+)\/(\d+)\/(\d+)/);
    if (directo) {
      setFila({
        proceso: Number(directo[1]),
        cod_formulario: Number(directo[2]),
        cod_plan: Number(directo[3]),
        cod_dignidad: 0,
        dignidad: criterio.dignidad || '',
        subtipo: '',
        cod_provincia: 0,
        provincia: criterio.provincia || '',
        cod_canton: 0,
        canton: criterio.canton || '',
        cod_parroquia: 0,
        parroquia: '',
        cod_circunscripcion: 0,
        circunscripcion: '',
        tiene_plan: true,
        url_plan: criterio.pdfUrl || '',
        archivo: '',
        organizacion: '',
        lista: criterio.lista || '',
        candidato: criterio.nombre,
        alterno: '',
        n_principales: 1,
        n_suplentes: 0,
      });
      return;
    }
    const local = criterio.pdfUrl || '';
    if (local.startsWith('/')) {
      const archivo = await fetch(local, { headers: { Range: 'bytes=0-0' } }).catch(() => null);
      if (archivo && (archivo.ok || archivo.status === 206)) {
        setFila({
          proceso: 0,
          cod_formulario: 0,
          cod_plan: 0,
          cod_dignidad: 0,
          dignidad: criterio.dignidad || '',
          subtipo: '',
          cod_provincia: 0,
          provincia: criterio.provincia || '',
          cod_canton: 0,
          canton: criterio.canton || '',
          cod_parroquia: 0,
          parroquia: '',
          cod_circunscripcion: 0,
          circunscripcion: '',
          tiene_plan: true,
          url_plan: local,
          archivo: local,
          organizacion: '',
          lista: criterio.lista || '',
          candidato: criterio.nombre,
          alterno: '',
          n_principales: 1,
          n_suplentes: 0,
        });
        return;
      }
    }
    const filas = await cargarCatalogo();
    const match = encontrarPlan(filas, criterio);
    if (!match) {
      setAviso('El CNE no publicó un PDF de plan para esta candidatura.');
      return;
    }
    setFila(match);
    } finally {
      setCargando(false);
    }
  };

  return { fila, aviso, cargando, abrir, cerrar: () => setFila(null) };
}

function srcOficial(fila: FilaPlan, paginaInicial?: number): string | null {
  const proceso = Number(fila.proceso);
  const formulario = Number(fila.cod_formulario);
  const plan = Number(fila.cod_plan);
  const pagina = Number(paginaInicial);
  const ancla = Number.isInteger(pagina) && pagina > 0 && pagina < 500 ? `#page=${pagina}&zoom=page-width` : '';
  if ([proceso, formulario, plan].every((valor) => Number.isInteger(valor) && valor > 0)) {
    return `/cne-plan/${proceso}/${formulario}/${plan}${ancla}`;
  }
  if (/^\/planes\/[A-Za-z0-9._ -]+\.pdf$/.test(fila.url_plan)) return `${fila.url_plan}${ancla}`;
  return null;
}

export default function VisorPlan({ fila, paginaInicial, onCerrar }: VisorPlanProps) {
  const src = srcOficial(fila, paginaInicial);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onCerrar}>
      <div
        className="bg-white w-full sm:max-w-5xl h-[92vh] sm:h-[88vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Plan de trabajo</p>
            <h3 className="text-lg font-black text-slate-900">{titulo(fila.candidato)}</h3>
            <p className="text-sm text-slate-500">
              {titulo(fila.canton || fila.provincia)} · Lista {fila.lista}
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600" aria-label="Cerrar plan">
            <X className="h-5 w-5" />
          </button>
        </div>
        {src ? (
          <iframe
            key={src}
            title={`Plan de ${titulo(fila.candidato)}${paginaInicial ? `, página ${paginaInicial}` : ''}`}
            src={src}
            referrerPolicy="no-referrer"
            className="flex-1 w-full bg-slate-100"
          />
        ) : (
          <p className="p-6 text-sm text-slate-700">Este visor solo abre el PDF publicado por el CNE para esta lista.</p>
        )}
      </div>
    </div>
  );
}
