import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { FilaPlan, titulo } from '../utils/catalogoPlanes';
import { AuditoriaPlan, PromesaAuditada } from '../utils/auditarPlan';

type EstadoPlan =
  | { estado: 'idle' }
  | { estado: 'leyendo' }
  | { estado: 'listo'; auditoria: AuditoriaPlan }
  | { estado: 'error'; mensaje: string };

interface ComparadorPlanesProps {
  filas: FilaPlan[];
  ladoA: number | null;
  ladoB: number | null;
  estados: Record<number, EstadoPlan>;
  onCambiarLado: (lado: 'a' | 'b', codigo: number) => void;
  onLeer: (fila: FilaPlan) => void;
  onAbrirPagina: (fila: FilaPlan, pagina: number) => void;
}

function filaDe(filas: FilaPlan[], codigo: number | null): FilaPlan | null {
  return filas.find((fila) => fila.cod_formulario === codigo) || null;
}

function ofertasPorTema(promesas: PromesaAuditada[]): Map<string, PromesaAuditada[]> {
  const temas = new Map<string, PromesaAuditada[]>();
  promesas.forEach((promesa) => {
    const grupo = temas.get(promesa.tema) || [];
    grupo.push(promesa);
    temas.set(promesa.tema, grupo);
  });
  return temas;
}

function puedeCompararse(auditoria: AuditoriaPlan): boolean {
  return !auditoria.sinTexto && auditoria.promesas.length > 0;
}

function motivoSinCitas(auditoria: AuditoriaPlan): string {
  if (auditoria.sinTexto || auditoria.paginasConTexto === 0) {
    return `El archivo tiene ${auditoria.paginas} páginas y no trae texto seleccionable. Puede ser un documento escaneado. Eso no cuenta como ausencia de propuestas.`;
  }
  return `Se leyeron ${auditoria.paginasConTexto} páginas con texto y no se aislaron frases comparables. Eso no es un cero de propuestas.`;
}

function ColumnaOfertas({
  fila,
  ofertas,
  onAbrirPagina,
}: {
  fila: FilaPlan;
  ofertas: PromesaAuditada[];
  onAbrirPagina: (fila: FilaPlan, pagina: number) => void;
}) {
  if (ofertas.length === 0) {
    return <p className="text-sm text-slate-500">Este tema no salió en la muestra. Eso no significa que el plan no lo mencione: abre el PDF completo.</p>;
  }
  return (
    <div className="space-y-3">
      {ofertas.map((oferta) => (
        <div key={`${oferta.pagina}-${oferta.promesa}`}>
          <button
            type="button"
            onClick={() => onAbrirPagina(fila, oferta.pagina)}
            className="text-xs font-black text-blue-700 hover:text-blue-900"
          >
            Página {oferta.pagina} · {oferta.articulo}
          </button>
          <p className="text-sm text-slate-800 mt-1">{oferta.promesa}</p>
        </div>
      ))}
    </div>
  );
}

export default function ComparadorPlanes({
  filas,
  ladoA,
  ladoB,
  estados,
  onCambiarLado,
  onLeer,
  onAbrirPagina,
}: ComparadorPlanesProps) {
  const filaA = filaDe(filas, ladoA);
  const filaB = filaDe(filas, ladoB);

  useEffect(() => {
    [filaA, filaB].forEach((fila) => {
      if (fila && !estados[fila.cod_formulario]) onLeer(fila);
    });
  }, [filaA, filaB, estados, onLeer]);

  const estadoA = ladoA ? estados[ladoA] : undefined;
  const estadoB = ladoB ? estados[ladoB] : undefined;
  const auditoriaA = estadoA?.estado === 'listo' ? estadoA.auditoria : null;
  const auditoriaB = estadoB?.estado === 'listo' ? estadoB.auditoria : null;
  const temasA = ofertasPorTema(auditoriaA?.promesas || []);
  const temasB = ofertasPorTema(auditoriaB?.promesas || []);
  const temas = [...new Set([...temasA.keys(), ...temasB.keys()])];
  const comparacionCompleta = Boolean(
    auditoriaA && auditoriaB && puedeCompararse(auditoriaA) && puedeCompararse(auditoriaB)
  );

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 shadow-sm space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Módulo de comparación</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">Dos planes, tema por tema</h3>
        <p className="text-sm text-slate-500 mt-1">
          Elige dos listas del mismo cargo. Cada frase sale de su PDF. Es una muestra con la misma regla para las dos, no un puntaje ni una lectura completa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {([
          ['a', ladoA, 'Plan A'],
          ['b', ladoB, 'Plan B'],
        ] as const).map(([lado, valor, etiqueta]) => (
          <label key={lado} className="block">
            <span className="text-xs font-black uppercase text-slate-500">{etiqueta}</span>
            <select
              value={valor || ''}
              onChange={(event) => onCambiarLado(lado, Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base sm:text-sm font-bold text-slate-900 min-h-12"
            >
              {filas.map((fila) => (
                <option key={fila.cod_formulario} value={fila.cod_formulario}>
                  Lista {fila.lista} · {titulo(fila.candidato)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {(estadoA?.estado === 'leyendo' || estadoB?.estado === 'leyendo') && (
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Leyendo los documentos completos para compararlos…
        </div>
      )}

      {(estadoA?.estado === 'error' || estadoB?.estado === 'error') && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
          {estadoA?.estado === 'error' ? estadoA.mensaje : ''} {estadoB?.estado === 'error' ? estadoB.mensaje : ''}
        </p>
      )}

      {auditoriaA && auditoriaB && filaA && filaB && !comparacionCompleta && (
        <div className="space-y-4">
          <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            La comparación queda suspendida. Hacen falta frases citables en los dos PDF. El plan que sí se pudo leer no aparece aquí como si hubiera ganado los temas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              [filaA, auditoriaA],
              [filaB, auditoriaB],
            ].map(([fila, auditoria]) => {
              const plan = fila as FilaPlan;
              const lectura = auditoria as AuditoriaPlan;
              const comparable = puedeCompararse(lectura);
              return (
                <div key={plan.cod_formulario} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black text-blue-700">LISTA {plan.lista}</p>
                  <h4 className="font-black text-slate-900 mt-1">{titulo(plan.candidato)}</h4>
                  <p className="text-sm text-slate-600 mt-3">
                    {comparable
                      ? `Este PDF sí tiene ${lectura.promesas.length} frases citables. Se mostrarán cuando el otro documento también las tenga.`
                      : motivoSinCitas(lectura)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAbrirPagina(plan, 1)}
                    className="mt-4 px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 hover:bg-slate-50"
                  >
                    Ver el documento completo
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {auditoriaA && auditoriaB && filaA && filaB && comparacionCompleta && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] gap-3 text-sm">
            <div className="hidden md:block" />
            {[
              [filaA, auditoriaA],
              [filaB, auditoriaB],
            ].map(([fila, auditoria]) => {
              const plan = fila as FilaPlan;
              const lectura = auditoria as AuditoriaPlan;
              return (
                <div key={plan.cod_formulario} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-black text-blue-700">LISTA {plan.lista}</p>
                  <h4 className="font-black text-slate-900 mt-1">{titulo(plan.candidato)}</h4>
                  <p className="text-xs text-slate-500 mt-2">
                    Muestra de {lectura.conteos.totalOfertas} frases. No es una nota del candidato.
                  </p>
                  <button
                    type="button"
                    onClick={() => onAbrirPagina(plan, 1)}
                    className="mt-3 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    Ver el PDF completo
                  </button>
                </div>
              );
            })}
          </div>

          {temas.map((tema) => (
            <div key={tema} className="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] gap-3 border-t border-slate-100 pt-4">
              <h4 className="font-black text-slate-900">{tema}</h4>
              <div className="rounded-2xl border border-slate-100 p-3 md:border-0 md:p-0">
                <p className="md:hidden text-xs font-black text-blue-700 mb-2">Lista {filaA.lista} · {titulo(filaA.candidato)}</p>
                <ColumnaOfertas fila={filaA} ofertas={temasA.get(tema) || []} onAbrirPagina={onAbrirPagina} />
              </div>
              <div className="rounded-2xl border border-slate-100 p-3 md:border-0 md:p-0">
                <p className="md:hidden text-xs font-black text-blue-700 mb-2">Lista {filaB.lista} · {titulo(filaB.candidato)}</p>
                <ColumnaOfertas fila={filaB} ofertas={temasB.get(tema) || []} onAbrirPagina={onAbrirPagina} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
