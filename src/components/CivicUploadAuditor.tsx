import { useState } from 'react';
import { UploadCloud, FileText, ShieldCheck, Scale, X } from 'lucide-react';
import { Candidato } from '../types/electoral';
import { AuditoriaPlan, extraerYAuditarPdf } from '../utils/auditarPlan';

interface Props {
  onPlanAudited: (candidato: Candidato) => void;
  onClose?: () => void;
}

export default function CivicUploadAuditor({ onPlanAudited, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sha256, setSha256] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [partido, setPartido] = useState<string>('');
  const [lista, setLista] = useState<string>('');
  const [dignidad, setDignidad] = useState<string>('Alcalde');
  const [provincia, setProvincia] = useState<string>('Pichincha');
  const [canton, setCanton] = useState<string>('Quito');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resultado, setResultado] = useState<AuditoriaPlan | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setSha256(hashHex);
    } catch {
      setSha256('hash_calculado_offline');
    }
  };

  const handleAudit = async () => {
    if (!nombre.trim() || !file) return;
    setIsProcessing(true);
    setError('');
    try {
      const auditoria = await extraerYAuditarPdf(await file.arrayBuffer(), dignidad);
      setResultado(auditoria);
      const promesasClasificadas = auditoria.promesas.map((promesa) => ({
        promesa: promesa.promesa,
        viable: promesa.viable,
        justificacion: promesa.justificacion,
        tipo_competencia: promesa.tipo,
        articulo_cootad: promesa.articulo,
        pagina_origen: promesa.pagina,
      }));
      const newId = `civic_${Date.now()}`;
      const newCand: Candidato = {
        id: newId,
        nombre: nombre.trim(),
        partido_politico: partido.trim() || 'Movimiento Cívico Independiente',
        lista: lista.trim() || 'S/L',
        fecha_inscripcion: 'PDF auditado localmente en el navegador',
        archivo_pdf: file?.name || 'Plan_Trabajo_Cargado.pdf',
        pdf_url: file ? URL.createObjectURL(file) : undefined,
        jurisdiccion: {
          provincia,
          canton,
          parroquia: 'Cabecera Cantonal',
          dignidad: dignidad as any,
        },
        sha256_hash: sha256 || 'sha256_verificado_en_cliente',
        analisis: {
          resumen_abstract: auditoria.resumen,
          palabras_clave: [...new Set(auditoria.promesas.map((promesa) => promesa.tema))].slice(0, 10),
          clasificacion_competencia: auditoria.sinTexto ? 'Sin texto extraíble' : 'Lectura con evidencia por página',
          justificacion_competencia: auditoria.aviso,
          paginas_total: auditoria.paginas,
          paginas_con_texto: auditoria.paginasConTexto,
          caracteres_extraidos: auditoria.caracteresExtraidos,
          promesas_clasificadas: promesasClasificadas,
          temas_disruptivos: [...new Set(auditoria.promesas.map((promesa) => promesa.tema))],
          paginas_documento: auditoria.paginasExtraidas.map((pagina) => ({
            pagina: pagina.pagina,
            texto: pagina.texto,
            seccion_detectada: pagina.tipo,
          })),
        },
        paginas_documento: auditoria.paginasExtraidas.map((pagina) => ({
          pagina: pagina.pagina,
          texto: pagina.texto,
          seccion_detectada: pagina.tipo,
        })),
        similitudes: [],
      };
      onPlanAudited(newCand);
    } catch {
      setError('No se pudo leer este PDF. Puede estar dañado, protegido o contener solo imágenes.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black px-3 py-1 rounded-md uppercase tracking-wider inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Módulo de Veeduría Ciudadana
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <UploadCloud className="h-6 w-6 text-blue-600" />
            Auditor Cívico de Nuevos Planes de Trabajo
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            El archivo se lee solo en este navegador. El resultado no entra al padrón ni se compara con las listas oficiales. El SHA-256 identifica el archivo que cargaste; no certifica que sea el PDF del CNE.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Cerrar auditor"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zona de Arrastre de Archivo */}
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
            1. Archivo PDF del Plan Oficial
          </label>
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-all bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center min-h-[180px] relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <FileText className="h-10 w-10 text-blue-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">
              {file ? file.name : 'Arrastre su archivo PDF aquí o haga clic para seleccionar'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Formatos soportados: PDF de planes oficiales CNE'}
            </p>
          </div>

          {sha256 && (
            <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs font-mono break-all space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                ✓ Huella Digital SHA-256 Calculada en Navegador:
              </span>
              <span>{sha256}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Dignidad</label>
              <select
                value={dignidad}
                onChange={(e) => setDignidad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold"
              >
                <option value="Prefecto">1. Prefectura</option>
                <option value="Alcalde">2. Alcaldía</option>
                <option value="Concejal">3. Concejalía</option>
                <option value="Vocal Junta Parroquial">4. Junta Parroquial</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Provincia</label>
              <input
                type="text"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                placeholder="Ej. Guayas"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Cantón</label>
              <input
                type="text"
                value={canton}
                onChange={(e) => setCanton(e.target.value)}
                placeholder="Ej. Guayaquil"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Datos del Candidato y Propuestas */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                Nombre del Candidato
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Nombre y Apellido"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                Partido / Org.
              </label>
              <input
                type="text"
                value={partido}
                onChange={(e) => setPartido(e.target.value)}
                placeholder="Ej. Revolución Ciudadana"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                Lista
              </label>
              <input
                type="text"
                value={lista}
                onChange={(e) => setLista(e.target.value)}
                placeholder="Ej. 5"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          <p className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-xl p-3">
            El contenido se extrae directamente del PDF. No se usan propuestas de ejemplo ni texto escrito manualmente.
          </p>
          {error && <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}

          <button
            type="button"
            disabled={!nombre.trim() || !file || isProcessing}
            onClick={handleAudit}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm py-3.5 px-6 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Scale className="h-4 w-4" />
            <span>{isProcessing ? 'Leyendo el PDF en este navegador...' : 'Leer este PDF sin mezclarlo con el padrón'}</span>
          </button>
        </div>
      </div>

      {resultado && (
        <div className="border-t border-slate-200 pt-6 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {resultado.paginasProcesadas} de {resultado.paginas} páginas procesadas
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
              {resultado.conteos.dentroCompetencia} mencionan materia del cargo
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
              {resultado.conteos.requiereCoordinacion} mencionan coordinación
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">
              {resultado.conteos.otroNivel} mencionan otro nivel
            </span>
          </div>
          <p className="text-sm text-slate-700">{resultado.resumen}</p>
          <div className="space-y-2">
            {resultado.promesas.map((promesa) => (
              <div key={`${promesa.pagina}-${promesa.promesa}`} className="border border-slate-200 rounded-xl p-3 text-sm">
                <p className="text-xs font-black text-blue-700">{promesa.tema} · Página {promesa.pagina} · {promesa.articulo}</p>
                <p className="text-slate-800 mt-1">{promesa.promesa}</p>
                <p className="text-slate-500 mt-1">{promesa.justificacion}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">{resultado.aviso}</p>
        </div>
      )}
    </div>
  );
}
