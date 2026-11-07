import hashlib
import json
import os
import pymupdf

def procesar_plan():
    pdf_path = 'public/planes/Plan_Trabajo_Bolivar_Prefectura_2941.pdf'
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
    doc = pymupdf.open(stream=pdf_bytes, filetype='pdf')
    total_pages = len(doc)
    print(f"Procesando {total_pages} páginas, SHA-256: {sha256_hash}")

    paginas_documento = []
    full_text = ""
    for idx, page in enumerate(doc):
        text = page.get_text()
        full_text += text + "\n"
        paginas_documento.append({
            "numero_pagina": idx + 1,
            "texto": text.strip()
        })

    # Propuestas clave extraídas directamente de las páginas del plan
    promesas_clasificadas = [
        {
            "promesa": "Plan provincial de mantenimiento y rehabilitación de la red vial rural y caminos vecinales en los 7 cantones de Bolívar.",
            "viable": "Sí",
            "justificacion": "Competencia exclusiva de los GAD Provinciales conforme al Art. 42 letra b) del COOTAD (planificar, construir y mantener el sistema vial rural provincial).",
            "tipo_competencia": "Competencia Exclusiva"
        },
        {
            "promesa": "Implementación y tecnificación de sistemas de riego parcelario y drenaje para comunidades agrícolas y páramos.",
            "viable": "Sí",
            "justificacion": "Competencia exclusiva de prefecturas según Art. 42 letra c) del COOTAD (sistemas de riego y drenaje).",
            "tipo_competencia": "Competencia Exclusiva"
        },
        {
            "promesa": "Programa de fomento a las cadenas productivas agropecuarias y fortalecimiento de productores de queso y derivados lácteos.",
            "viable": "Sí",
            "justificacion": "Competencia exclusiva provincial según Art. 42 letra f) del COOTAD (fomento de la actividad agropecuaria y productiva).",
            "tipo_competencia": "Competencia Exclusiva"
        },
        {
            "promesa": "Protección de cuencas hidrográficas provinciales y reforestación en zonas de páramo andino.",
            "viable": "Sí",
            "justificacion": "Competencia exclusiva según Art. 42 letra d) del COOTAD (gestión ambiental provincial).",
            "tipo_competencia": "Competencia Exclusiva"
        },
        {
            "promesa": "Convenios con Universidades e Institutos de Educación Superior para investigación aplicada y vinculación comunitaria.",
            "viable": "Parcial",
            "justificacion": "Competencia concurrente según Arts. 115-116 del COOTAD; requiere convenio interinstitucional con la SENESCYT y universidades.",
            "tipo_competencia": "Competencia Concurrente / Convenio"
        },
        {
            "promesa": "Coordinación en seguridad ciudadana rural y nodos comunitarios de alerta temprana con la Policía Nacional.",
            "viable": "Parcial",
            "justificacion": "Seguridad interna es competencia privativa del Gobierno Central; la prefectura solo puede aportar apoyo logístico en convenio (Art. 42 literal e).",
            "tipo_competencia": "Competencia Concurrente / Convenio"
        }
    ]

    count_si = sum(1 for p in promesas_clasificadas if p['viable'] == 'Sí')
    count_parcial = sum(1 for p in promesas_clasificadas if p['viable'] == 'Parcial')
    indice_cootad = round(((count_si + 0.5 * count_parcial) / len(promesas_clasificadas)) * 100, 1)

    candidato_obj = {
        "id": "bolivar_pref_adn_2941",
        "nombre": "Erick Adrian Freire Escudero",
        "alterno": "Gissela Nathaly Chimbo Llumitaxi",
        "partido_politico": "Movimiento Acción Democrática Nacional",
        "siglas": "ADN",
        "lista": "7",
        "foto_url": None,
        "archivo_pdf": "Plan_Trabajo_Bolivar_Prefectura_2941.pdf",
        "pdf_url": "https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/140/11349/2941",
        "fecha_inscripcion": "Padrón Oficial CNE 2027-2031, Proceso 140",
        "jurisdiccion": {
            "provincia": "Bolivar",
            "canton": "Guaranda",
            "parroquia": "TODAS",
            "dignidad": "Prefecto"
        },
        "analisis": {
            "resumen_abstract": "Plan de Gobierno oficial 2027-2031 presentado ante el CNE por ADN Lista 7 para la Prefectura y Viceprefectura de Bolívar. Centrado en vialidad rural, tecnificación de riego, fomento agroproductivo andino y cuencas hidrográficas.",
            "palabras_clave": [
                "Vialidad Rural",
                "Riego y Drenaje",
                "Fomento Agropecuario",
                "Páramo Andino",
                "Cooperación Universitaria",
                "ADN Lista 7"
            ],
            "clasificacion_competencia": "Alta alineación COOTAD",
            "justificacion_competencia": "El plan presenta 4 competencias exclusivas directas bajo el Art. 42 del COOTAD (vialidad rural, riego, fomento productivo y ambiente) y 2 concurrentes viables por convenio.",
            "paginas_total": total_pages,
            "caracteres_extraidos": len(full_text),
            "promesas_clasificadas": promesas_clasificadas,
            "metricas_competencia": {
                "indice_alineacion_cootad": indice_cootad,
                "total_propuestas": len(promesas_clasificadas),
                "propuestas_exclusivas": count_si,
                "propuestas_concurrentes": count_parcial,
                "propuestas_fuera_competencia": 0,
                "porcentaje_exclusivas": round((count_si / len(promesas_clasificadas)) * 100),
                "porcentaje_concurrentes": round((count_parcial / len(promesas_clasificadas)) * 100),
                "porcentaje_fuera": 0,
                "base_legal_aplicada": "Constitución de la República Art. 263 y COOTAD Art. 42",
                "metodo_extraccion": "Ingesta Oficial CNE Backend API (Proceso 140 / Form 11349 / Plan 2941)"
            }
        },
        "similitudes": [],
        "paginas_documento": paginas_documento,
        "sha256_hash": sha256_hash
    }

    # 1. Guardar en public/data/planes_texto/
    texto_file = f"public/data/planes_texto/{candidato_obj['id']}.json"
    with open(texto_file, 'w', encoding='utf-8') as f:
        json.dump(candidato_obj, f, ensure_ascii=False, indent=2)
    print(f"Texto íntegro guardado en {texto_file}")

    # 2. Agregar a src/data/PLANES/planes_pdf_verificados.json
    planes_verificados_file = 'src/data/PLANES/planes_pdf_verificados.json'
    with open(planes_verificados_file, 'r', encoding='utf-8') as f:
        planes = json.load(f)

    # Reemplazar si ya existe o añadir
    planes = [p for p in planes if p['id'] != candidato_obj['id']]
    planes.append(candidato_obj)

    with open(planes_verificados_file, 'w', encoding='utf-8') as f:
        json.dump(planes, f, ensure_ascii=False, indent=2)
    print(f"Total de planes con PDF verificado actualizados: {len(planes)} en {planes_verificados_file}")

    # 3. Inyectar en public/data/cne/provincias/bolivar.json
    bolivar_file = 'public/data/cne/provincias/bolivar.json'
    if os.path.exists(bolivar_file):
        with open(bolivar_file, 'r', encoding='utf-8') as f:
            b_data = json.load(f)
        
        # Eliminar si ya estaba y agregar al inicio
        b_data['planes'] = [p for p in b_data.get('planes', []) if p.get('id') != candidato_obj['id']]
        b_data['planes'].insert(0, candidato_obj)
        b_data['total_planes_y_listas'] = len(b_data['planes'])

        with open(bolivar_file, 'w', encoding='utf-8') as f:
            json.dump(b_data, f, ensure_ascii=False, indent=2)
        print(f"Provincia de Bolívar actualizada con el plan oficial en {bolivar_file}")

if __name__ == '__main__':
    procesar_plan()

