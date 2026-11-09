#!/usr/bin/env python3
"""
Generador de Auditorías Estáticas Precalculadas para Observatorio Electoral Ecuador.
Descarga y pre-analiza los planes de trabajo del CNE para servirlos en formato JSON estático.
Garantiza 0 ms de respuesta, 0 consumo de CPU en el cliente y 0 peticiones concurrentes al CNE.
"""

import argparse
import concurrent.futures
import json
import logging
import os
import re
import sys
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import urllib.request
import ssl

import pymupdf

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("GeneradorAuditorias")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
INDICE_PATH = BASE_DIR / "public" / "data" / "cne" / "indice_planes_api.jsonl"
OUTPUT_PATH = BASE_DIR / "public" / "data" / "cne" / "auditorias_precalculadas.json"

# ==========================================
# REGLAS NORMATIVAS Y LEXICAS COOTAD
# ==========================================

FUERA_CLAVES = [
    "policia nacional",
    "fuerzas armadas",
    "comando policial",
    "iva",
    "impuesto a la renta",
    "politica monetaria",
    "banco central",
    "hospital de especialidad",
    "aduana",
    "relaciones exteriores",
]

PARCIAL_CLAVES = [
    "salud",
    "educacion",
    "seguridad ciudadana",
    "videovigilancia",
    "camara de vigilancia",
    "turismo",
    "cultura",
    "deporte",
    "ministerio",
    "universidad",
]

POR_DIGNIDAD = {
    "Prefecto": {
        "viable": "Sí",
        "tipo": "Competencia provincial",
        "articulo": "COOTAD Art. 42 / CRE Art. 263",
        "claves": [
            "vialidad rural", "vial rural", "camino vecinal", "caminos vecinales",
            "red vial provincial", "mantenimiento vial", "asfaltado rural", "asfalto rural",
            "lastrado", "puente", "puentes", "carretera rural", "conectividad rural",
            "riego", "drenaje", "represa", "canal de riego", "canales de riego",
            "cuenca hidrografica", "microcuenca", "cuenca", "recurso hidrico",
            "fuentes de agua", "paramo", "paramos", "fomento productivo",
            "agropecuar", "productiv", "agricultura", "ganaderia", "cadena de valor",
            "soberania alimentaria", "agroecol", "semillas", "asistencia tecnica",
            "emprendimiento rural", "gestion ambiental", "medio ambiente", "reforest",
            "conservacion", "area protegida", "turismo rural", "turismo comunitario",
            "turismo provincial", "desarrollo rural", "infraestructura rural",
            "ordenamiento territorial provincial",
        ],
    },
    "Alcalde": {
        "viable": "Sí",
        "tipo": "Competencia municipal",
        "articulo": "COOTAD Art. 55",
        "claves": [
            "agua potable", "alcantarillado", "saneamiento", "desecho", "residuo",
            "transito", "transporte publico", "movilidad urbana", "uso de suelo",
            "ocupacion del suelo", "catastro", "mercado", "camal", "faenamiento",
            "cementerio", "paviment", "asfalt", "vialidad urbana",
            "ordenamiento territorial", "espacio publico",
        ],
    },
    "Concejal": {
        "viable": "Sí",
        "tipo": "Atribución del concejo municipal",
        "articulo": "COOTAD Art. 57",
        "claves": ["ordenanza", "fiscaliz", "concejo", "legisl", "reglamento", "control politico"],
    },
    "Vocal Junta Parroquial": {
        "viable": "Sí",
        "tipo": "Competencia parroquial",
        "articulo": "COOTAD Art. 65",
        "claves": [
            "parroquial", "comunitari", "camino vecinal", "agua comunitaria",
            "infraestructura comunitaria", "junta parroquial", "organizacion territorial",
        ],
    },
}

AJENO = {
    "Prefecto": {
        "viable": "No",
        "tipo": "Corresponde al municipio",
        "articulo": "COOTAD Art. 55",
        "claves": [
            "agua potable domiciliaria", "alcantarillado urbano", "catastro urbano",
            "transito cantonal", "cementerio cantonal", "mercado municipal",
        ],
    },
    "Alcalde": {
        "viable": "No",
        "tipo": "Corresponde a la prefectura",
        "articulo": "COOTAD Art. 42",
        "claves": ["vialidad rural provincial", "riego provincial", "sistema provincial de riego"],
    },
    "Concejal": {
        "viable": "Parcial",
        "tipo": "La ejecución corresponde a la alcaldía",
        "articulo": "COOTAD Arts. 57 y 60",
        "claves": ["construir", "asfaltar", "alcantarillado", "agua potable", "pavimentar"],
    },
}

VERBOS_ACCION = re.compile(
    r"\b(construir|implementar|desarrollar|fortalecer|garantizar|promover|mejorar|"
    r"rehabilitar|mantener|crear|elaborar|ejecutar|gestionar|impulsar|ampliar|"
    r"optimizar|regular|fiscalizar|coordinar|recuperar|dotar|modernizar|establecer|"
    r"fomentar|reducir|incrementar|formular|actualizar|consolidar|capacitar|"
    r"proteger|instalar|adecuar|brindar|generar)(emos|an|á|a|ar|er|ir)?\b",
    re.IGNORECASE,
)

SECCION_PROPUESTAS = re.compile(
    r"\b(propuestas?|plan de accion|planes programas y proyectos|objetivos? estrategicos?|"
    r"lineas? de accion|programas? y proyectos?|metas?|banco de ideas|plan plurianual|"
    r"ejes? estrategicos?|eje\s+\d+|componentes?|proyectos?|estrategias?|plan de trabajo|"
    r"lineas? estrategicas?|dimension\s+\w+|competencias?)\b",
    re.IGNORECASE,
)

SECCION_DIAGNOSTICO = re.compile(
    r"\b(diagnostico|situacion actual|caracterizacion|antecedentes|marco legal|base legal|datos generales|metodologia)\b",
    re.IGNORECASE,
)

MARCA_INDICE = re.compile(r"\b(indice|contenido|tabla de contenido)\b", re.IGNORECASE)
MENCIONA_COORDINACION = re.compile(r"\b(coordin\w*|convenio\w*|articul\w*|en conjunto)\b", re.IGNORECASE)


def norm(texto: str) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFD", texto)
    limpio = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    return limpio.lower()


def resolver_dignidad(dignidad_raw: str) -> str:
    nd = norm(dignidad_raw)
    if "prefect" in nd:
        return "Prefecto"
    if "concej" in nd:
        return "Concejal"
    if "junta" in nd or "vocal" in nd or "parroq" in nd:
        return "Vocal Junta Parroquial"
    return "Alcalde"


def contiene(texto: str, claves: List[str], palabra_completa: bool = False) -> Optional[str]:
    base = norm(texto)
    for clave in claves:
        limpia = re.escape(norm(clave))
        inicio = rf"(^|[^a-z0-9]){limpia}"
        patron = rf"{inicio}([^a-z0-9]|$)" if palabra_completa or len(limpia) <= 4 else inicio
        if re.search(patron, base):
            return clave
    return None


def redactar_reservados(linea: str) -> str:
    return re.sub(r"\b\d{9,10}\b", "[dato reservado]", linea)


def tema_de(clave: str) -> str:
    limpia = norm(clave)
    if re.search(r"agua|alcantarill|saneamiento", limpia):
        return "Agua y saneamiento"
    if re.search(r"vial|camino|asfalt|paviment|puente|lastrado", limpia):
        return "Vialidad"
    if re.search(r"transito|transporte|movilidad", limpia):
        return "Movilidad"
    if re.search(r"mercado|camal|faenamiento", limpia):
        return "Mercados y faenamiento"
    if re.search(r"suelo|catastro|ordenamiento", limpia):
        return "Territorio y suelo"
    if re.search(r"riego|drenaje|cuenca|represa", limpia):
        return "Riego y cuencas"
    if re.search(r"product|agropec|fomento|agricultura|ganaderia", limpia):
        return "Producción"
    if re.search(r"ambiente|reforest|paramo|residuo|desecho|conservacion", limpia):
        return "Ambiente"
    if re.search(r"ordenanza|legisl|reglamento", limpia):
        return "Normativa"
    if re.search(r"fiscal|control politico", limpia):
        return "Fiscalización"
    if re.search(r"salud", limpia):
        return "Salud"
    if re.search(r"educacion", limpia):
        return "Educación"
    if re.search(r"seguridad|policia", limpia):
        return "Seguridad"
    if re.search(r"turismo", limpia):
        return "Turismo"
    return "Otra oferta"


def clasificar_oferta(linea: str, dignidad_raw: str, pagina: int) -> Optional[Dict[str, Any]]:
    dignidad = resolver_dignidad(dignidad_raw)
    fuera = contiene(linea, FUERA_CLAVES, palabra_completa=True)

    if fuera and MENCIONA_COORDINACION.search(norm(linea)):
        return {
            "promesa": redactar_reservados(linea),
            "viable": "Parcial",
            "tipo": "Requiere coordinación o convenio",
            "justificacion": f"La frase menciona “{fuera}” junto a una coordinación. No se interpreta como si el cargo asumiera esa materia nacional.",
            "articulo": "COOTAD, coordinación interinstitucional",
            "pagina": pagina,
            "tema": tema_de(fuera),
            "evidencia": fuera,
        }
    if fuera:
        return {
            "promesa": redactar_reservados(linea),
            "viable": "No",
            "tipo": "Corresponde al Estado central",
            "justificacion": f"La frase menciona “{fuera}”. Esa palabra corresponde a una materia nacional; comprueba la página antes de leerla como una propuesta.",
            "articulo": "Constitución Art. 261",
            "pagina": pagina,
            "tema": tema_de(fuera),
            "evidencia": fuera,
        }

    propia = POR_DIGNIDAD.get(dignidad, POR_DIGNIDAD["Alcalde"])
    clave_propia = contiene(linea, propia["claves"])
    if clave_propia and dignidad != "Concejal":
        return {
            "promesa": redactar_reservados(linea),
            "viable": "Sí",
            "tipo": propia["tipo"],
            "justificacion": f"La frase menciona “{clave_propia}”. Esa palabra aparece entre las materias de este nivel de gobierno.",
            "articulo": propia["articulo"],
            "pagina": pagina,
            "tema": tema_de(clave_propia),
            "evidencia": clave_propia,
        }

    ajena = AJENO.get(dignidad)
    clave_ajena = contiene(linea, ajena["claves"]) if ajena else None
    if clave_ajena and ajena:
        return {
            "promesa": redactar_reservados(linea),
            "viable": ajena["viable"],
            "tipo": ajena["tipo"],
            "justificacion": f"La frase menciona “{clave_ajena}”. Esa palabra se asocia a otro nivel de gobierno; comprueba el contexto en la página.",
            "articulo": ajena["articulo"],
            "pagina": pagina,
            "tema": tema_de(clave_ajena),
            "evidencia": clave_ajena,
        }

    if clave_propia:
        return {
            "promesa": redactar_reservados(linea),
            "viable": "Sí",
            "tipo": propia["tipo"],
            "justificacion": f"La frase menciona “{clave_propia}”. Esa palabra aparece entre las materias de este cargo.",
            "articulo": propia["articulo"],
            "pagina": pagina,
            "tema": tema_de(clave_propia),
            "evidencia": clave_propia,
        }

    parcial = contiene(linea, PARCIAL_CLAVES, palabra_completa=True)
    if parcial:
        return {
            "promesa": redactar_reservados(linea),
            "viable": "Parcial",
            "tipo": "Requiere coordinación o convenio",
            "justificacion": f"La frase menciona “{parcial}”. Esa palabra suele exigir coordinación con otra institución.",
            "articulo": "COOTAD, coordinación interinstitucional",
            "pagina": pagina,
            "tema": tema_de(parcial),
            "evidencia": parcial,
        }
    return None


def parece_indice(linea: str) -> bool:
    nums = len(re.findall(r"\b\d+(?:\.\d+){1,3}\b", linea))
    puntos = bool(re.search(r"\.{3,}", linea))
    pag_final = bool(re.search(r"\s\d{1,3}\s*$", linea))
    return nums >= 2 or puntos or (nums >= 1 and pag_final)


def parece_metadato(linea: str) -> bool:
    return bool(
        re.search(
            r"cedula|nombres y apellidos|datos del postulante|dignidad a la que|firma|certifico|"
            r"guia metodologica|elaboracion de planes de trabajo|periodo 2027.?2031",
            linea,
            re.IGNORECASE,
        )
    )


def normalizar_lineas(texto: str) -> List[str]:
    crudas = [re.sub(r"\s+", " ", l).strip() for l in texto.split("\n") if l.strip()]
    unidas = []
    for linea in crudas:
        if not unidas:
            unidas.append(linea)
            continue
        ant = unidas[-1]
        if (
            len(ant) < 220
            and not re.search(r"[.:;!?]$", ant)
            and not re.search(r"^\d+(?:\.\d+)*[.)]?\s", linea)
            and not parece_indice(ant)
        ):
            unidas[-1] = f"{ant} {linea}"[:700]
        else:
            unidas.append(linea)
    return unidas


def detectar_tipo_pagina(texto: str, pagina: int) -> str:
    limpio = re.sub(r"\s+", " ", texto).strip()
    lineas = normalizar_lineas(texto)
    lineas_ind = sum(1 for l in lineas if parece_indice(l))
    if MARCA_INDICE.search(limpio[:800]) or (len(lineas) >= 4 and (lineas_ind / len(lineas)) >= 0.35):
        return "indice"
    if pagina <= 2 and (len(limpio) < 1400 or re.search(r"plan de trabajo|candidato|candidatura", limpio[:600], re.IGNORECASE)):
        return "portada"
    if SECCION_PROPUESTAS.search(limpio):
        return "propuestas"
    if SECCION_DIAGNOSTICO.search(limpio):
        return "diagnostico"
    return "otro"


def temas_de_frase(linea: str, dignidad: str) -> List[str]:
    temas = set()
    dig = resolver_dignidad(dignidad)
    for k in FUERA_CLAVES:
        if contiene(linea, [k], palabra_completa=True):
            temas.add(tema_de(k))
    for k in POR_DIGNIDAD.get(dig, POR_DIGNIDAD["Alcalde"])["claves"]:
        if contiene(linea, [k]):
            temas.add(tema_de(k))
    for k in PARCIAL_CLAVES:
        if contiene(linea, [k], palabra_completa=True):
            temas.add(tema_de(k))
    esp = [t for t in temas if t != "Otra oferta"]
    return esp if esp else list(temas)


def muestra_equilibrada(promesas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    por_tema: Dict[str, List[Dict[str, Any]]] = {}
    for p in promesas:
        t = p.get("tema", "Otra oferta")
        grupo = por_tema.setdefault(t, [])
        if len(grupo) < 3:
            grupo.append(p)
    salida = []
    for g in por_tema.values():
        for p in g:
            if len(salida) >= 12:
                return salida
            salida.append(p)
    return salida


def auditar_documento(paginas_texto: List[Tuple[int, str]], dignidad: str) -> Dict[str, Any]:
    total_paginas = len(paginas_texto)
    caracteres_totales = sum(len(txt) for _, txt in paginas_texto)
    paginas_con_texto = sum(1 for _, txt in paginas_texto if len(txt.strip()) >= 20)

    if caracteres_totales < 40:
        return {
            "resumen": "Este documento PDF es escaneado o contiene imágenes sin capa de texto digital.",
            "paginas": total_paginas,
            "paginasConTexto": paginas_con_texto,
            "paginasProcesadas": total_paginas,
            "caracteresExtraidos": caracteres_totales,
            "promesas": [],
            "conteos": {
                "dentroCompetencia": 0,
                "requiereCoordinacion": 0,
                "otroNivel": 0,
                "totalOfertas": 0,
                "lineasDescartadas": 0,
            },
            "paginasExtraidas": [],
            "aviso": "El CNE publicó este plan en formato de imagen escaneada. No se encontraron caracteres digitales para indexación automática.",
            "sinTexto": True,
        }

    vistas = set()
    promesas_crudas = []
    descartadas = 0
    seccion_activa = "otro"

    for num_pag, texto in paginas_texto:
        tipo_pag = detectar_tipo_pagina(texto, num_pag)
        if tipo_pag in ("propuestas", "diagnostico"):
            seccion_activa = tipo_pag
        if tipo_pag in ("portada", "indice"):
            descartadas += len(normalizar_lineas(texto))
            continue

        for linea in normalizar_lineas(texto):
            if SECCION_PROPUESTAS.search(linea) and len(linea) < 160:
                seccion_activa = "propuestas"
            if SECCION_DIAGNOSTICO.search(linea) and len(linea) < 160:
                seccion_activa = "diagnostico"

            frases = [
                f.strip()
                for f in re.split(r"(?<=[.!?;])\s+", linea)
                if 45 <= len(f.strip()) <= 320
            ]
            if not frases:
                descartadas += 1
                continue

            for frase in frases:
                es_oferta = (
                    VERBOS_ACCION.search(frase)
                    and not parece_indice(frase)
                    and not parece_metadato(frase)
                    and not re.search(r"\b(fuente:|se recomienda|recomendacion tecnica|rendicion de cuentas)\b", frase, re.IGNORECASE)
                    and (
                        seccion_activa == "propuestas"
                        or tipo_pag == "propuestas"
                        or seccion_activa == "otro"
                        or re.search(r"\b(proponemos|nos comprometemos|se ejecutara|se implementara|planteamos|garantizaremos|construiremos)\b", frase, re.IGNORECASE)
                    )
                )
                if not es_oferta:
                    descartadas += 1
                    continue

                auditada = clasificar_oferta(frase, dignidad, num_pag)
                if not auditada:
                    descartadas += 1
                    continue

                temas = temas_de_frase(frase, dignidad)
                if len(temas) > 1:
                    auditada["tema"] = "Varios temas"
                    auditada["articulo"] = "Frase con más de una materia"
                    auditada["justificacion"] = f"La frase menciona {' y '.join(temas)}. No se guarda bajo un solo tema."

                clave_dedup = re.sub(r"[^a-z0-9 ]", "", norm(auditada["promesa"]))[:120]
                if clave_dedup in vistas:
                    continue
                vistas.add(clave_dedup)
                promesas_crudas.append(auditada)

    promesas = muestra_equilibrada(promesas_crudas)
    dentro = sum(1 for p in promesas if p.get("viable") == "Sí" and p.get("tema") != "Varios temas")
    coord = sum(1 for p in promesas if p.get("viable") == "Parcial" and p.get("tema") != "Varios temas")
    otro = sum(1 for p in promesas if p.get("viable") == "No" and p.get("tema") != "Varios temas")

    if not promesas:
        resumen = "No se encontraron ofertas concretas con verbo de acción y competencia identificable en el texto extraíble."
    else:
        temas_dest = list(dict.fromkeys(p["tema"] for p in promesas))[:4]
        resumen = f"Muestra de hasta 12 frases sobre {', '.join(temas_dest)}. La misma regla se aplica a todas las listas. No es una calificación ni cubre todo el PDF."

    return {
        "resumen": resumen,
        "paginas": total_paginas,
        "paginasConTexto": paginas_con_texto,
        "paginasProcesadas": total_paginas,
        "caracteresExtraidos": caracteres_totales,
        "promesas": promesas,
        "conteos": {
            "dentroCompetencia": dentro,
            "requiereCoordinacion": coord,
            "otroNivel": otro,
            "totalOfertas": len(promesas),
            "lineasDescartadas": descartadas,
        },
        "paginasExtraidas": [],
        "aviso": "Muestra automática del PDF oficial, con la misma regla para todas las listas. No es un dictamen, un ranking ni una lectura completa.",
        "sinTexto": False,
    }


# ==========================================
# DESCARGA Y EXTRACCIÓN
# ==========================================

def descargar_y_auditar_plan(fila: Dict[str, Any], timeout: int = 25) -> Optional[Dict[str, Any]]:
    proceso = fila.get("proceso", 140)
    cod_formulario = fila.get("cod_formulario")
    cod_plan = fila.get("cod_plan")
    dignidad = fila.get("dignidad", "Alcalde")

    if not cod_formulario or not cod_plan:
        return None

    url = f"https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/{proceso}/{cod_formulario}/{cod_plan}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/pdf,application/octet-stream,*/*",
        },
    )

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    pdf_bytes = None
    for intento in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                if resp.status == 200:
                    pdf_bytes = resp.read()
                    break
        except Exception as e:
            if intento == 2:
                logger.warning(f"Error descargando {fila.get('candidato')} (Form: {cod_formulario}): {e}")
            time.sleep(1.0 * (intento + 1))

    if not pdf_bytes or len(pdf_bytes) < 500:
        return None

    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        paginas_texto = []
        for i in range(len(doc)):
            page = doc[i]
            txt = page.get_text() or ""
            paginas_texto.append((i + 1, txt))
        doc.close()

        return auditar_documento(paginas_texto, dignidad)
    except Exception as e:
        logger.error(f"Fallo al procesar PDF de {fila.get('candidato')}: {e}")
        return None


# ==========================================
# PROCESAMIENTO POR LOTES
# ==========================================

def procesar_lote(
    filas: List[Dict[str, Any]],
    salida_path: Path,
    max_workers: int = 6,
) -> None:
    auditorias: Dict[str, Any] = {}
    if salida_path.exists():
        try:
            with open(salida_path, "r", encoding="utf-8") as f:
                auditorias = json.load(f)
            logger.info(f"Caché previa cargada con {len(auditorias)} planes precalculados.")
        except Exception:
            auditorias = {}

    pendientes = []
    for f in filas:
        proceso = f.get("proceso", 140)
        c_form = f.get("cod_formulario")
        c_plan = f.get("cod_plan")
        clave = f"{proceso}-{c_form}-{c_plan}"
        clave_alt = str(c_form)
        if clave not in auditorias and clave_alt not in auditorias:
            pendientes.append(f)

    logger.info(f"Total a procesar: {len(pendientes)} de {len(filas)} candidaturas.")
    if not pendientes:
        logger.info("Todos los planes seleccionados ya se encuentran precalculados.")
        return

    completados = 0
    guardados_recientes = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futuros = {executor.submit(descargar_y_auditar_plan, fila): fila for fila in pendientes}
        for fut in concurrent.futures.as_completed(futuros):
            fila = futuros[fut]
            proceso = fila.get("proceso", 140)
            c_form = fila.get("cod_formulario")
            c_plan = fila.get("cod_plan")
            clave = f"{proceso}-{c_form}-{c_plan}"

            try:
                resultado = fut.result()
                if resultado:
                    auditorias[clave] = resultado
                    auditorias[str(c_form)] = resultado  # Acceso directo por código de formulario
                    guardados_recientes += 1
            except Exception as e:
                logger.warning(f"Error procesando {fila.get('candidato')}: {e}")

            completados += 1
            if completados % 10 == 0 or completados == len(pendientes):
                logger.info(f"Progreso: {completados}/{len(pendientes)} ({guardados_recientes} exitosos)")
                # Guardar checkpoint intermedio cada 25 items
                if guardados_recientes % 25 == 0:
                    with open(salida_path, "w", encoding="utf-8") as out:
                        json.dump(auditorias, out, ensure_ascii=False, indent=2)

    with open(salida_path, "w", encoding="utf-8") as out:
        json.dump(auditorias, out, ensure_ascii=False, indent=2)

    logger.info(f"Finalizado. Guardadas {len(auditorias)} auditorías en {salida_path}")


def main():
    parser = argparse.ArgumentParser(description="Precalculador estático de auditorías CNE")
    parser.add_argument("--solo-prefecturas", action="store_true", help="Auditar únicamente prefecturas (24 provincias)")
    parser.add_argument("--canton", type=str, default=None, help="Filtrar por nombre de cantón (ej: Quito, Guayaquil)")
    parser.add_argument("--provincia", type=str, default=None, help="Filtrar por provincia")
    parser.add_argument("--limite", type=int, default=None, help="Límite máximo de planes a auditar")
    parser.add_argument("--workers", type=int, default=6, help="Hilos concurrentes para descarga")
    args = parser.parse_args()

    if not INDICE_PATH.exists():
        logger.error(f"No se encontró el índice en {INDICE_PATH}")
        sys.exit(1)

    logger.info("Cargando índice electoral del CNE...")
    filas = []
    with open(INDICE_PATH, "r", encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if linea:
                filas.append(json.loads(linea))

    filtradas = [f for f in filas if f.get("tiene_plan") and f.get("cod_plan")]

    if args.solo_prefecturas:
        filtradas = [f for f in filtradas if "prefect" in norm(f.get("dignidad", "")) or "prefect" in norm(f.get("subtipo", ""))]
    elif args.canton:
        nc = norm(args.canton)
        filtradas = [f for f in filtradas if norm(f.get("canton", "")) == nc]
    elif args.provincia:
        np = norm(args.provincia)
        filtradas = [f for f in filtradas if norm(f.get("provincia", "")) == np]

    if args.limite:
        filtradas = filtradas[:args.limite]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    procesar_lote(filtradas, OUTPUT_PATH, max_workers=args.workers)


if __name__ == "__main__":
    main()

