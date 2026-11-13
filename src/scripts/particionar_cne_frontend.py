# -*- coding: utf-8 -*-
"""
Particiona indice_planes_api.jsonl y auditorias_precalculadas.json por provincia
para evitar descargar ~7.8 MB monolíticos en el cliente.
"""
import json
import os
import re
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CNE_DIR = BASE_DIR / "public" / "data" / "cne"
PROV_OUT = CNE_DIR / "provincias"
AUD_OUT = CNE_DIR / "auditorias_provincias"

PROV_SLUG_MAP = {
    "sto dgo tsachilas": "santo_domingo_de_los_tsachilas",
    "sto domingo": "santo_domingo_de_los_tsachilas",
    "santo domingo": "santo_domingo_de_los_tsachilas",
    "santo domingo de los tsachilas": "santo_domingo_de_los_tsachilas",
    "sta elena": "santa_elena",
    "santa elena": "santa_elena",
    "zamora ch": "zamora_chinchipe",
    "zamora chinchipe": "zamora_chinchipe",
}


def norm(val: str) -> str:
    val = unicodedata.normalize("NFD", val or "")
    val = "".join(c for c in val if unicodedata.category(c) != "Mn")
    val = val.lower()
    val = re.sub(r"[^a-z0-9\s]", " ", val)
    return re.sub(r"\s+", " ", val).strip()


def slug_provincia(nombre: str) -> str:
    n = norm(nombre)
    return PROV_SLUG_MAP.get(n, n.replace(" ", "_"))


def main():
    PROV_OUT.mkdir(parents=True, exist_ok=True)
    AUD_OUT.mkdir(parents=True, exist_ok=True)

    por_prov: dict[str, list[dict]] = {}
    form_to_prov: dict[str, str] = {}
    busqueda: list[dict] = []
    orgs: dict[str, dict] = {}

    with open(CNE_DIR / "indice_planes_api.jsonl", "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            slug = slug_provincia(row.get("provincia", ""))
            if not slug:
                continue
            por_prov.setdefault(slug, []).append(row)
            cod_form = str(row.get("cod_formulario", ""))
            if cod_form:
                form_to_prov[cod_form] = slug

            # Agregar estadisticas por organizacion politica + lista
            org_nombre = (row.get("organizacion") or "SIN ORGANIZACIÓN").strip()
            lista = str(row.get("lista") or "").strip()
            org_key = f"{org_nombre}||{lista}"
            entry = orgs.get(org_key)
            if entry is None:
                entry = {
                    "organizacion": org_nombre,
                    "lista": lista,
                    "total": 0,
                    "prefecto": 0,
                    "alcalde": 0,
                    "concejal": 0,
                    "junta_parroquial": 0,
                    "con_plan": 0,
                    "provincias": set(),
                }
                orgs[org_key] = entry
            entry["total"] += 1
            if row.get("tiene_plan") and row.get("cod_plan"):
                entry["con_plan"] += 1
            if row.get("provincia"):
                entry["provincias"].add(row["provincia"].strip())
            sub = norm(row.get("subtipo") or row.get("dignidad") or "")
            if "prefect" in sub:
                entry["prefecto"] += 1
            elif "alcald" in sub:
                entry["alcalde"] += 1
            elif "concejal" in sub or "circunscripcion" in sub:
                entry["concejal"] += 1
            elif "parroquial" in sub or "vocal" in sub:
                entry["junta_parroquial"] += 1

            busqueda.append({
                "cod_provincia": row.get("cod_provincia", 0),
                "provincia": row.get("provincia", ""),
                "cod_canton": row.get("cod_canton", 0),
                "canton": row.get("canton", ""),
                "cod_parroquia": row.get("cod_parroquia", 0),
                "parroquia": row.get("parroquia", ""),
                "cod_circunscripcion": row.get("cod_circunscripcion", 0),
                "circunscripcion": row.get("circunscripcion", ""),
                "subtipo": row.get("subtipo", ""),
                "cod_formulario": row.get("cod_formulario", 0),
                "lista": row.get("lista", ""),
                "candidato": row.get("candidato", ""),
                "alterno": row.get("alterno", ""),
            })

    for slug, rows in por_prov.items():
        with open(PROV_OUT / f"{slug}.json", "w", encoding="utf-8") as out:
            json.dump(rows, out, ensure_ascii=False, separators=(",", ":"))

    with open(CNE_DIR / "indice_busqueda.json", "w", encoding="utf-8") as out:
        json.dump(busqueda, out, ensure_ascii=False, separators=(",", ":"))

    resumen_orgs = sorted(
        (
            {
                **{k: v for k, v in item.items() if k != "provincias"},
                "provincias": len(item["provincias"]),
            }
            for item in orgs.values()
        ),
        key=lambda x: (norm(x["organizacion"]), x["lista"]),
    )
    with open(CNE_DIR / "resumen_organizaciones.json", "w", encoding="utf-8") as out:
        json.dump(resumen_orgs, out, ensure_ascii=False, separators=(",", ":"))

    aud_path = BASE_DIR / "src" / "data" / "cne_cache" / "auditorias_precalculadas.json"
    if not aud_path.exists():
        aud_path = CNE_DIR / "auditorias_precalculadas.json"
    if aud_path.exists():
        with open(aud_path, "r", encoding="utf-8") as f:
            auds = json.load(f)
        aud_por_prov: dict[str, dict] = {slug: {} for slug in por_prov}
        for key, val in auds.items():
            # Omitir claves cortas duplicadas ("75") y guardar solo "140-75-2401" para reducir ~50% el tamaño
            if "-" not in key:
                continue
            parts = key.split("-")
            cod_form = parts[1]
            slug = form_to_prov.get(cod_form)
            if slug:
                aud_por_prov.setdefault(slug, {})[key] = val

        for slug, items in aud_por_prov.items():
            with open(AUD_OUT / f"{slug}.json", "w", encoding="utf-8") as out:
                json.dump(items, out, ensure_ascii=False, separators=(",", ":"))

    max_prov = max((os.path.getsize(p) for p in PROV_OUT.glob("*.json")), default=0)
    max_aud = max((os.path.getsize(p) for p in AUD_OUT.glob("*.json")), default=0)
    busq_size = os.path.getsize(CNE_DIR / "indice_busqueda.json")
    orgs_size = os.path.getsize(CNE_DIR / "resumen_organizaciones.json")
    print(f"Provincias particionadas: {len(por_prov)}")
    print(f"Max provincia JSON: {max_prov / 1024:.1f} KB")
    print(f"Max auditoria provincia JSON: {max_aud / 1024:.1f} KB")
    print(f"indice_busqueda.json: {busq_size / 1024:.1f} KB")
    print(f"resumen_organizaciones.json: {orgs_size / 1024:.1f} KB ({len(resumen_orgs)} organizaciones)")


if __name__ == "__main__":
    main()

