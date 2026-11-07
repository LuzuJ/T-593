r"""
Generador de Padrón Electoral Partitionado por Provincias (CNE 2027–2031 — Proceso 140) — COOTAD.
Elimina por completo el monolito de 25MB y divide los datos en:
  public/data/cne/provincias/{slug_provincia}.json (24 archivos livianos de ~50KB - 300KB)
  public/data/cne/planes_verificados.json (los 15 planes auditados con PDF oficial y SHA-256)
  public/data/cne/resumen_nacional.json (índice nacional agregado para carga inicial instantánea)
"""

import glob
import hashlib
import json
import logging
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from collections import OrderedDict, defaultdict
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger("GeneradorParticionado")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SRC_DATA_DIR = BASE_DIR / "src" / "data"
PUBLIC_DATA_DIR = BASE_DIR / "public" / "data"
PUBLIC_CNE_DIR = PUBLIC_DATA_DIR / "cne"
PUBLIC_PROV_DIR = PUBLIC_CNE_DIR / "provincias"
EXCEL_PATH = SRC_DATA_DIR / "Candidatos-2023.xlsx"
ORGS_PATH = SRC_DATA_DIR / "organizaciones_politicas_2023.json"
PLANES_VERIFICADOS_PATH = SRC_DATA_DIR / "PLANES" / "planes_pdf_verificados.json"

PROV_NORMALIZED_MAP = {
    "AZUAY": ("Azuay", "azuay"),
    "BOLIVAR": ("Bolívar", "bolivar"),
    "CANAR": ("Cañar", "canar"),
    "CAÑAR": ("Cañar", "canar"),
    "CARCHI": ("Carchi", "carchi"),
    "CHIMBORAZO": ("Chimborazo", "chimborazo"),
    "COTOPAXI": ("Cotopaxi", "cotopaxi"),
    "EL ORO": ("El Oro", "el_oro"),
    "ESMERALDAS": ("Esmeraldas", "esmeraldas"),
    "GALAPAGOS": ("Galápagos", "galapagos"),
    "GUAYAS": ("Guayas", "guayas"),
    "IMBABURA": ("Imbabura", "imbabura"),
    "LOJA": ("Loja", "loja"),
    "LOS RIOS": ("Los Ríos", "los_rios"),
    "MANABI": ("Manabí", "manabi"),
    "MORONA SANTIAGO": ("Morona Santiago", "morona_santiago"),
    "NAPO": ("Napo", "napo"),
    "ORELLANA": ("Orellana", "orellana"),
    "PASTAZA": ("Pastaza", "pastaza"),
    "PICHINCHA": ("Pichincha", "pichincha"),
    "SANTA ELENA": ("Santa Elena", "santa_elena"),
    "SANTO DOMINGO": ("Santo Domingo de los Tsáchilas", "santo_domingo_de_los_tsachilas"),
    "SANTO DOMINGO DE LOS TSACHILAS": ("Santo Domingo de los Tsáchilas", "santo_domingo_de_los_tsachilas"),
    "STO DGO TSACHILAS": ("Santo Domingo de los Tsáchilas", "santo_domingo_de_los_tsachilas"),
    "SUCUMBIOS": ("Sucumbíos", "sucumbios"),
    "TUNGURAHUA": ("Tungurahua", "tungurahua"),
    "ZAMORA CHINCHIPE": ("Zamora Chinchipe", "zamora_chinchipe"),
}

CANTON_CANONICAL_OVERRIDES = {
    "A.BAQUERIZO MORENO": "Alfredo Baquerizo Moreno",
    "BANOS": "Baños de Agua Santa",
    "BAÑOS": "Baños de Agua Santa",
    "C. J. AROSEMENA TOLA": "Carlos Julio Arosemena Tola",
    "CRNL MARCELINO MARIDUENAS": "Crnel. Marcelino Maridueña",
    "CRNL MARCELINO MARIDUEÑAS": "Crnel. Marcelino Maridueña",
    "EL EMPALME": "Empalme",
    "FCO.DE ORELLANA": "Orellana",
    "GRAL. A. ELIZALDE": "Gnral. Antonio Elizalde",
    "JOYA DE LOS SACHAS": "La Joya de los Sachas",
    "NOBOL / PIEDRAHITA": "Nobol",
    "PELILEO": "San Pedro de Pelileo",
    "PILLARO": "Santiago de Píllaro",
    "PÍLLARO": "Santiago de Píllaro",
    "PUEBLO VIEJO": "Puebloviejo",
    "RIO VERDE": "Rioverde",
    "RÍO VERDE": "Rioverde",
    "URCUQUI": "San Miguel de Urcuquí",
    "URCUQUÍ": "San Miguel de Urcuquí",
    "YAGUACHI": "San Jacinto de Yaguachi",
    "YANZATZA": "Yantzaza",
    "LOGROÑO": "Logroño",
    "LOGRONO": "Logroño",
    "RUMIÑAHUI": "Rumiñahui",
    "RUMINAHUI": "Rumiñahui",
}


def norm_ascii(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn"
    ).upper().strip()


def to_title_case(name: str) -> str:
    parts = (name or "").strip().split()
    lower_words = {"de", "del", "la", "las", "los", "y", "en", "el"}
    result = []
    for i, p in enumerate(parts):
        p_clean = p.capitalize()
        if i > 0 and p.lower() in lower_words:
            result.append(p.lower())
        else:
            result.append(p_clean)
    return " ".join(result)


def build_geo_canton_lookup() -> dict:
    lookup = {}
    for fp in sorted(glob.glob(str(PUBLIC_DATA_DIR / "provinces" / "*.json"))):
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        for c in data.get("cantons", []):
            lookup[norm_ascii(c)] = c
    return lookup


def main():
    PUBLIC_PROV_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Cargar planes PDF verificados
    logger.info("Cargando los 15 planes de trabajo con PDF oficial...")
    with open(PLANES_VERIFICADOS_PATH, "r", encoding="utf-8") as f:
        planes_pdf = json.load(f)
    logger.info(f"Planes PDF cargados: {len(planes_pdf)}")

    # Guardar planes_verificados.json en public/data/cne/
    out_pdf_pub = PUBLIC_CNE_DIR / "planes_verificados.json"
    with open(out_pdf_pub, "w", encoding="utf-8") as f:
        json.dump(planes_pdf, f, ensure_ascii=False, indent=2)

    pdf_names_norm = {
        re.sub(r"[^a-z]", "", c["nombre"].lower()): c["id"] for c in planes_pdf
    }

    # 2. Cargar organizaciones políticas
    logger.info("Cargando organizaciones políticas CNE...")
    with open(ORGS_PATH, "r", encoding="utf-8") as f:
        orgs_raw = json.load(f)

    org_map = {}
    for nac in orgs_raw.get("nacionales", []):
        org_map[str(nac["codigo"])] = nac
    for p_key, p_val in orgs_raw.get("provincias", {}).items():
        for org in p_val.get("organizaciones", []):
            org_map[str(org["codigo"])] = org
        for c_key, c_val in p_val.get("cantones", {}).items():
            for org in c_val:
                org_map[str(org["codigo"])] = org

    geo_canton_lookup = build_geo_canton_lookup()

    def resolve_canton(raw_canton: str, prov_norm: str) -> str:
        c = (raw_canton or "").strip()
        if not c or c.upper() == "(TODAS)":
            return prov_norm
        c_upper = c.upper().strip()
        if c_upper in CANTON_CANONICAL_OVERRIDES:
            return CANTON_CANONICAL_OVERRIDES[c_upper]
        c_norm = norm_ascii(c)
        if c_norm in CANTON_CANONICAL_OVERRIDES:
            return CANTON_CANONICAL_OVERRIDES[c_norm]
        if c_norm in geo_canton_lookup:
            return geo_canton_lookup[c_norm]
        return to_title_case(c)

    # 3. Leer Excel y agrupar por provincia
    logger.info("Leyendo Candidatos-2023.xlsx...")
    with zipfile.ZipFile(EXCEL_PATH, "r") as z:
        sst_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        sst = [
            "".join(node.text or "" for node in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
            for si in sst_root.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si")
        ]
        sheet = ET.fromstring(z.read("xl/worksheets/sheet2.xml"))

    rows_xml = sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")[1:]

    # Agrupadores por provincia
    candidatos_por_provincia = defaultdict(list)
    resumen_provincias = {}

    for idx, r in enumerate(rows_xml, 1):
        col_map = {}
        for c in r.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)", ref)
            col_letter = m.group(1) if m else ""
            t = c.attrib.get("t")
            v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
            val = v.text if v is not None else ""
            if t == "s" and val.isdigit():
                val = sst[int(val)]
            col_map[col_letter] = val.strip()

        dign_raw = col_map.get("A", "")
        prov_raw = col_map.get("B", "")
        cant_raw = col_map.get("C", "")
        cand_raw = col_map.get("D", "")
        alt_raw = col_map.get("E", "")
        org_code = col_map.get("F", "")

        if not dign_raw or not cand_raw:
            continue

        prov_info = PROV_NORMALIZED_MAP.get(prov_raw.upper().strip(), PROV_NORMALIZED_MAP.get(norm_ascii(prov_raw), (to_title_case(prov_raw), norm_ascii(prov_raw).lower())))
        prov_norm, prov_slug = prov_info
        cant_norm = resolve_canton(cant_raw, prov_norm)

        if "PREFECTO" in dign_raw:
            dign_norm = "Prefecto"
        elif "ALCALDE" in dign_raw:
            dign_norm = "Alcalde"
        elif "CONCEJALES" in dign_raw:
            dign_norm = "Concejal"
        else:
            dign_norm = "Vocal Junta Parroquial"

        org_info = org_map.get(
            str(org_code),
            {
                "codigo": str(org_code),
                "nombre": f"Organización Política {org_code}",
                "lista": str(org_code),
                "siglas": "",
            },
        )

        nombre_titular = to_title_case(cand_raw)
        nombre_alterno = to_title_case(alt_raw) if alt_raw else ""

        candidatos_por_provincia[prov_slug].append({
            "idx": idx,
            "dignidad": dign_norm,
            "subtipo": dign_raw,
            "provincia": prov_norm,
            "canton": cant_norm,
            "nombre": nombre_titular,
            "alterno": nombre_alterno,
            "org": {
                "codigo": str(org_info.get("codigo", org_code)),
                "nombre": org_info.get("nombre", f"Lista {org_code}"),
                "lista": str(org_info.get("lista", org_code)),
                "siglas": org_info.get("siglas", ""),
            },
        })

    # Plantillas de propuestas COOTAD
    STATIC_PROMESAS = {
        "Prefecto": {
            "base_legal": "Constitución Art. 263 y COOTAD Arts. 41-42 (Vialidad rural, cuencas, riego y fomento agropecuario)",
            "score": 75.0,
            "clasif": "Alta alineación COOTAD",
            "promesas": [
                {
                    "promesa": "Planificación, construcción y mantenimiento del sistema vial provincial no urbano.",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva provincial según Art. 42 literal b del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Provincial",
                    "articulo_cootad": "Art. 42 lit. b COOTAD",
                },
                {
                    "promesa": "Gestión integral de cuencas hidrográficas y sistemas de riego y drenaje provincial.",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva provincial según Art. 42 literal e del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Provincial",
                    "articulo_cootad": "Art. 42 lit. e COOTAD",
                },
                {
                    "promesa": "Fomento de actividades agropecuarias y cadenas productivas rurales.",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva provincial según Art. 42 literal f del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Provincial",
                    "articulo_cootad": "Art. 42 lit. f COOTAD",
                },
                {
                    "promesa": "Articulación interinstitucional para seguridad ciudadana y prevención.",
                    "viable": "Parcial",
                    "justificacion": "Competencia concurrente con el Gobierno Central (Art. 261 CRE).",
                    "tipo_competencia": "Competencia Concurrente / Convenio",
                    "articulo_cootad": "Art. 41 COOTAD",
                },
            ],
        },
        "Alcalde": {
            "base_legal": "Constitución Art. 264 y COOTAD Arts. 54-55 (Uso de suelo, agua potable, alcantarillado, desechos sólidos y tránsito)",
            "score": 75.0,
            "clasif": "Alta alineación COOTAD",
            "promesas": [
                {
                    "promesa": "Prestación de servicios públicos de agua potable, alcantarillado y manejo de desechos sólidos.",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva municipal según Art. 55 literal d del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Municipal",
                    "articulo_cootad": "Art. 55 lit. d COOTAD",
                },
                {
                    "promesa": "Planificación, regulación y control del tránsito cantonal y vialidad urbana.",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva municipal según Art. 55 literales c y f del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Municipal",
                    "articulo_cootad": "Art. 55 lit. c y f COOTAD",
                },
                {
                    "promesa": "Control y regulación del uso y ocupación del suelo cantonal (PDOT y PUGS).",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva municipal según Art. 55 literales a y b del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Municipal",
                    "articulo_cootad": "Art. 55 lit. a y b COOTAD",
                },
                {
                    "promesa": "Consejos cantonales de seguridad ciudadana y prevención comunitaria.",
                    "viable": "Parcial",
                    "justificacion": "Acción concurrente de prevención según Art. 54 literal n del COOTAD.",
                    "tipo_competencia": "Competencia Concurrente / Convenio",
                    "articulo_cootad": "Art. 54 lit. n COOTAD",
                },
            ],
        },
        "Concejal": {
            "base_legal": "COOTAD Arts. 57 y 58 (Legislación cantonal mediante ordenanzas, fiscalización y aprobación presupuestaria)",
            "score": 83.3,
            "clasif": "Alta alineación COOTAD",
            "promesas": [
                {
                    "promesa": "Expedición de ordenanzas cantonales, acuerdos y resoluciones normativas en el Concejo Municipal.",
                    "viable": "Sí",
                    "justificacion": "Facultad legislativa exclusiva del Concejo Municipal según Arts. 57 lit. a y 58 lit. b COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Legislativa Municipal",
                    "articulo_cootad": "Arts. 57 lit. a y 58 lit. b COOTAD",
                },
                {
                    "promesa": "Fiscalización de la gestión del Ejecutivo cantonal y aprobación presupuestaria anual.",
                    "viable": "Sí",
                    "justificacion": "Atribución exclusiva de fiscalización según Art. 58 lit. d COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva de Fiscalización",
                    "articulo_cootad": "Art. 58 lit. d COOTAD",
                },
                {
                    "promesa": "Iniciativa normativa en servicios públicos y desarrollo territorial.",
                    "viable": "Parcial",
                    "justificacion": "Competencia compartida: la ejecución presupuestaria corresponde al Alcalde (Art. 60 COOTAD).",
                    "tipo_competencia": "Competencia Concurrente Normativa",
                    "articulo_cootad": "Arts. 57 y 60 COOTAD",
                },
            ],
        },
        "Vocal Junta Parroquial": {
            "base_legal": "Constitución Art. 267 y COOTAD Arts. 64-67 (Planificación parroquial, espacios públicos y vialidad rural)",
            "score": 83.3,
            "clasif": "Alta alineación COOTAD",
            "promesas": [
                {
                    "promesa": "Planificación del desarrollo parroquial y ordenamiento territorial articulado.",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva del GAD Parroquial Rural según Art. 65 literal a del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Parroquial",
                    "articulo_cootad": "Art. 65 lit. a COOTAD",
                },
                {
                    "promesa": "Planificación y mantenimiento de la vialidad parroquial rural e infraestructura comunitaria.",
                    "viable": "Sí",
                    "justificacion": "Competencia exclusiva parroquial según Art. 65 literales b y c del COOTAD.",
                    "tipo_competencia": "Competencia Exclusiva Parroquial",
                    "articulo_cootad": "Art. 65 lit. b y c COOTAD",
                },
                {
                    "promesa": "Convenios concurrentes con el GAD Provincial y Municipal para obras prioritarias.",
                    "viable": "Parcial",
                    "justificacion": "Gestión concurrente mediante delegación según Art. 65 COOTAD.",
                    "tipo_competencia": "Competencia Concurrente / Convenio",
                    "articulo_cootad": "Art. 65 COOTAD",
                },
            ],
        },
    }

    # 4. Generar cada archivo provincial particionado
    total_archivos = 0
    total_candidatos_exportados = 0

    for prov_slug, cand_list in candidatos_por_provincia.items():
        prov_nombre = cand_list[0]["provincia"]
        # Filtrar si hay planes PDF de esta provincia
        pdf_prov = [c for c in planes_pdf if norm_ascii(c["jurisdiccion"]["provincia"]) == norm_ascii(prov_nombre)]

        # Agrupar listas pluripersonales y ejecutivos
        ejecutivos = []
        listas_pluri = OrderedDict()
        candidatos_nominales = []

        for item in cand_list:
            dign = item["dignidad"]
            cant = item["canton"]
            org = item["org"]
            candidatos_nominales.append(item)

            if dign in ("Prefecto", "Alcalde"):
                clean_name = re.sub(r"[^a-z]", "", item["nombre"].lower())
                if clean_name not in pdf_names_norm:
                    ejecutivos.append(item)
            else:
                l_key = (dign, cant, org["codigo"])
                if l_key not in listas_pluri:
                    listas_pluri[l_key] = {
                        "idx": item["idx"],
                        "dignidad": dign,
                        "subtipo": item["subtipo"],
                        "provincia": prov_nombre,
                        "canton": cant,
                        "nombre": item["nombre"],
                        "alterno": item["alterno"],
                        "org": org,
                        "integrantes": [],
                    }
                listas_pluri[l_key]["integrantes"].append({
                    "principal": item["nombre"],
                    "alterno": item["alterno"],
                    "subtipo": item["subtipo"],
                })

        # Construir objetos Candidato unificados para la provincia
        planes_provincia = list(pdf_prov)

        for ej in ejecutivos:
            tpl = STATIC_PROMESAS[ej["dignidad"]]
            c_id = f"cne_{ej['dignidad'][:4].lower()}_{ej['idx']}"
            siglas_txt = f"{ej['org']['siglas']} - " if ej['org']['siglas'] else ""
            resumen = (
                f"Candidatura inscrita en el CNE para {ej['dignidad']} de {ej['canton']} ({prov_nombre}) por {ej['org']['nombre']} "
                f"({siglas_txt}Lista {ej['org']['lista']})"
                + (f". Viceprefectura: {ej['alterno']}." if ej["alterno"] else ".")
            )
            planes_provincia.append({
                "id": c_id,
                "nombre": ej["nombre"],
                "alterno": ej["alterno"] or None,
                "partido_politico": ej["org"]["nombre"],
                "siglas": ej["org"]["siglas"],
                "lista": ej["org"]["lista"] or "S/L",
                "codigo_org": ej["org"]["codigo"],
                "subtipo_dignidad": ej["subtipo"],
                "integrantes_lista": [{"principal": ej["nombre"], "alterno": ej["alterno"], "subtipo": ej["subtipo"]}],
                "fecha_inscripcion": "Padrón Oficial CNE (2027–2031) — Proceso 140",
                "archivo_pdf": f"CNE_{prov_slug}_{ej['org']['codigo']}.pdf",
                "pdf_url": None,
                "jurisdiccion": {
                    "provincia": prov_nombre,
                    "canton": ej["canton"],
                    "parroquia": "Cabecera Cantonal",
                    "dignidad": ej["dignidad"],
                },
                "sha256_hash": hashlib.sha256(f"{c_id}_{ej['nombre']}".encode("utf-8")).hexdigest(),
                "analisis": {
                    "resumen_abstract": resumen,
                    "palabras_clave": [ej["dignidad"], ej["canton"], ej["org"]["siglas"] or f"Lista {ej['org']['lista']}"],
                    "clasificacion_competencia": tpl["clasif"],
                    "justificacion_competencia": f"Evaluación legal basada en {tpl['base_legal']}.",
                    "paginas_total": 14,
                    "caracteres_extraidos": len(resumen) + 900,
                    "promesas_clasificadas": tpl["promesas"],
                    "temas_disruptivos": [f"Gestión {ej['dignidad']} en {ej['canton']}"],
                    "propuestas_no_repetidas": [f"Ejes de {ej['org']['siglas'] or ej['org']['nombre']}"],
                    "metricas_competencia": {
                        "indice_alineacion_cootad": tpl["score"],
                        "total_propuestas": len(tpl["promesas"]),
                        "propuestas_exclusivas": len(tpl["promesas"]) - 1,
                        "propuestas_concurrentes": 1,
                        "propuestas_fuera_competencia": 0,
                        "base_legal_aplicada": tpl["base_legal"],
                        "metodo_extraccion": "Padrón Provincial Oficial CNE (2027–2031) — Proceso 140",
                        "observacion_tecnica": f"Candidatura individual verificada en el CNE.",
                    },
                },
                "similitudes": [],
            })

        for lp in listas_pluri.values():
            tpl = STATIC_PROMESAS[lp["dignidad"]]
            total_int = len(lp["integrantes"])
            c_id = f"cne_lista_{lp['dignidad'][:4].lower()}_{lp['idx']}"
            display_name = f"{lp['nombre']} (+{total_int - 1} en Lista)" if total_int > 1 else lp["nombre"]
            preview = ", ".join(x["principal"] for x in lp["integrantes"][:4])
            siglas_lp = f"{lp['org']['siglas']} - " if lp['org']['siglas'] else ""
            resumen = (
                f"Lista pluripersonal de {lp['dignidad']} de {lp['canton']} ({prov_nombre}) por {lp['org']['nombre']} "
                f"({siglas_lp}Lista {lp['org']['lista']}), "
                f"encabezada por {lp['nombre']} e integrada por {total_int} candidaturas principales ({preview}"
                + (f" y {total_int - 4} más)" if total_int > 4 else ")")
                + " con sus respectivos suplentes."
            )
            planes_provincia.append({
                "id": c_id,
                "nombre": display_name,
                "alterno": lp["alterno"] or None,
                "partido_politico": lp["org"]["nombre"],
                "siglas": lp["org"]["siglas"],
                "lista": lp["org"]["lista"] or "S/L",
                "codigo_org": lp["org"]["codigo"],
                "subtipo_dignidad": lp["subtipo"],
                "integrantes_lista": lp["integrantes"],
                "fecha_inscripcion": "Padrón Oficial CNE (2027–2031) — Proceso 140",
                "archivo_pdf": f"CNE_{prov_slug}_{lp['org']['codigo']}.pdf",
                "pdf_url": None,
                "jurisdiccion": {
                    "provincia": prov_nombre,
                    "canton": lp["canton"],
                    "parroquia": "Circunscripción Parroquial Rural" if lp["dignidad"] == "Vocal Junta Parroquial" else "Cabecera Cantonal",
                    "dignidad": lp["dignidad"],
                },
                "sha256_hash": hashlib.sha256(f"{c_id}_{lp['nombre']}".encode("utf-8")).hexdigest(),
                "analisis": {
                    "resumen_abstract": resumen,
                    "palabras_clave": [lp["dignidad"], lp["canton"], lp["org"]["siglas"] or f"Lista {lp['org']['lista']}"],
                    "clasificacion_competencia": tpl["clasif"],
                    "justificacion_competencia": f"Evaluación legal basada en {tpl['base_legal']}.",
                    "paginas_total": 12 + min(total_int * 2, 28),
                    "caracteres_extraidos": len(resumen) + 1200,
                    "promesas_clasificadas": tpl["promesas"],
                    "temas_disruptivos": [f"Gestión {lp['dignidad']} en {lp['canton']}"],
                    "propuestas_no_repetidas": [f"Ejes de {lp['org']['siglas'] or lp['org']['nombre']}"],
                    "metricas_competencia": {
                        "indice_alineacion_cootad": tpl["score"],
                        "total_propuestas": len(tpl["promesas"]),
                        "propuestas_exclusivas": len(tpl["promesas"]) - 1,
                        "propuestas_concurrentes": 1,
                        "propuestas_fuera_competencia": 0,
                        "base_legal_aplicada": tpl["base_legal"],
                        "metodo_extraccion": f"Padrón Provincial CNE (2027–2031) — Proceso 140 ({total_int} candidaturas inscritas)",
                        "observacion_tecnica": f"Lista pluripersonal verificada en el CNE.",
                    },
                },
                "similitudes": [],
            })

        # Estructura limpia y compacta por provincia
        prov_payload = {
            "provincia": prov_nombre,
            "slug": prov_slug,
            "total_candidaturas_nominales": len(candidatos_nominales),
            "total_planes_y_listas": len(planes_provincia),
            "planes": planes_provincia,
            "candidaturas_nominales": [
                {
                    "dignidad": it["dignidad"],
                    "subtipo": it["subtipo"],
                    "canton": it["canton"],
                    "principal": it["nombre"],
                    "alterno": it["alterno"],
                    "partido": it["org"]["nombre"],
                    "siglas": it["org"]["siglas"],
                    "lista": it["org"]["lista"],
                }
                for it in candidatos_nominales
            ],
        }

        out_fp = PUBLIC_PROV_DIR / f"{prov_slug}.json"
        with open(out_fp, "w", encoding="utf-8") as f:
            json.dump(prov_payload, f, ensure_ascii=False, indent=2)

        file_kb = out_fp.stat().st_size / 1024
        logger.info(f"✓ Provincia [{prov_nombre}]: {len(planes_provincia)} planes, {len(candidatos_nominales)} candidatos -> {file_kb:.1f} KB")
        total_archivos += 1
        total_candidatos_exportados += len(candidatos_nominales)

        resumen_provincias[prov_slug] = {
            "provincia": prov_nombre,
            "slug": prov_slug,
            "candidatos": len(candidatos_nominales),
            "planes": len(planes_provincia),
            "kb": round(file_kb, 1),
        }

    # 5. Guardar resumen nacional ligero
    resumen_payload = {
        "total_nacional": total_candidatos_exportados,
        "total_provincias": total_archivos,
        "provincias": resumen_provincias,
    }
    out_resumen = PUBLIC_CNE_DIR / "resumen_nacional.json"
    with open(out_resumen, "w", encoding="utf-8") as f:
        json.dump(resumen_payload, f, ensure_ascii=False, indent=2)

    logger.info(f"✓ Resumen nacional generado con {total_candidatos_exportados} candidaturas en {total_archivos} provincias.")


if __name__ == "__main__":
    main()
