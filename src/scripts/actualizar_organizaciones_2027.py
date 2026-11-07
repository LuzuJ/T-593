# -*- coding: utf-8 -*-
"""
Actualiza organizaciones_politicas_2023.json con todas las organizaciones
inscritas para el Proceso CNE 140 (Período Seccional 2027-2031).
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
JSON_PATH = BASE_DIR / "src" / "data" / "organizaciones_politicas_2023.json"

with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# Organizaciones prioritarias 2027-2031
NACIONALES_2027 = [
    {
        "codigo": 1,
        "nombre": "MOVIMIENTO CENTRO DEMOCRÁTICO",
        "siglas": "CD",
        "lista": "1",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 2,
        "nombre": "PARTIDO UNIDAD POPULAR",
        "siglas": "UP",
        "lista": "2",
        "tipo": "PARTIDO POLITICO",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 21770,
        "nombre": "ALIANZA CIUDADANA",
        "siglas": "ALIANZA CIUDADANA",
        "lista": "2-17-70",
        "tipo": "ALIANZA ELECTORAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 3,
        "nombre": "PARTIDO SOCIEDAD PATRIÓTICA 21 DE ENERO",
        "siglas": "PSP",
        "lista": "3",
        "tipo": "PARTIDO POLITICO",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 4,
        "nombre": "MOVIMIENTO PUEBLO IGUALDAD DEMOCRACIA PID",
        "siglas": "PID",
        "lista": "4",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 5,
        "nombre": "MOVIMIENTO POLÍTICO REVOLUCIÓN CIUDADANA",
        "siglas": "RC",
        "lista": "5",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 6,
        "nombre": "PARTIDO SOCIAL CRISTIANO",
        "siglas": "PSC",
        "lista": "6",
        "tipo": "PARTIDO POLITICO",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 7,
        "nombre": "MOVIMIENTO ACCIÓN DEMOCRÁTICA NACIONAL, ADN",
        "siglas": "ADN",
        "lista": "7",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 8,
        "nombre": "PARTIDO AVANZA",
        "siglas": "AVANZA",
        "lista": "8",
        "tipo": "PARTIDO POLITICO",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 12,
        "nombre": "PARTIDO IZQUIERDA DEMOCRÁTICA",
        "siglas": "ID",
        "lista": "12",
        "tipo": "PARTIDO POLITICO",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 16,
        "nombre": "MOVIMIENTO AMIGO",
        "siglas": "AMIGO",
        "lista": "16",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 17,
        "nombre": "PARTIDO SOCIALISTA ECUATORIANO",
        "siglas": "PSE",
        "lista": "17",
        "tipo": "PARTIDO POLITICO",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 18,
        "nombre": "MOVIMIENTO DE UNIDAD PLURINACIONAL PACHAKUTIK",
        "siglas": "MUPP",
        "lista": "18",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 20,
        "nombre": "MOVIMIENTO FUTURO",
        "siglas": "FUTURO",
        "lista": "20",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 21,
        "nombre": "MOVIMIENTO CREO, CREANDO OPORTUNIDADES",
        "siglas": "CREO",
        "lista": "21",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 23,
        "nombre": "PARTIDO SOCIEDAD UNIDA MÁS ACCIÓN, SUMA",
        "siglas": "SUMA",
        "lista": "23",
        "tipo": "PARTIDO POLITICO",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 25,
        "nombre": "MOVIMIENTO CONSTRUYE",
        "siglas": "CONSTRUYE",
        "lista": "25",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
    {
        "codigo": 33,
        "nombre": "MOVIMIENTO RENOVACIÓN TOTAL, RETO",
        "siglas": "RETO",
        "lista": "33",
        "tipo": "MOVIMIENTO POLITICO NACIONAL",
        "ambito": "NACIONAL",
    },
]

PROVINCIALES_2027 = {
    "PICHINCHA": [
        {
            "codigo": 79,
            "nombre": "MOVIMIENTO IMPARABLES",
            "siglas": "IMPARABLES",
            "lista": "79",
            "tipo": "MOVIMIENTO POLITICO PROVINCIAL",
            "ambito": "PROVINCIAL",
            "canton": "QUITO",
        },
        {
            "codigo": 21770,
            "nombre": "ALIANZA CIUDADANA",
            "siglas": "ALIANZA CIUDADANA",
            "lista": "2-17-70",
            "tipo": "ALIANZA ELECTORAL",
            "ambito": "PROVINCIAL",
            "canton": "QUITO",
        },
    ]
}

# 1. Actualizar nacionales
nacionales_map = {str(o.get("lista")): o for o in data.get("nacionales", [])}
for org in NACIONALES_2027:
    nacionales_map[str(org["lista"])] = org

data["nacionales"] = sorted(
    list(nacionales_map.values()),
    key=lambda x: int(x["lista"].split("-")[0]) if x["lista"].replace("-", "").isdigit() else 999
)

# 2. Actualizar cada provincia asegurando las organizaciones clave y nacionales
for prov_key, prov_data in data.get("provincias", {}).items():
    orgs_prov = prov_data.get("organizaciones", [])
    prov_lista_set = {str(o.get("lista")) for o in orgs_prov}

    # Agregar nacionales prioritarias si no están
    for n in NACIONALES_2027:
        if str(n["lista"]) not in prov_lista_set:
            orgs_prov.append({
                "codigo": n["codigo"],
                "nombre": n["nombre"],
                "siglas": n["siglas"],
                "lista": n["lista"],
                "tipo": n["tipo"],
                "ambito": "NACIONAL",
                "canton": "",
            })
            prov_lista_set.add(str(n["lista"]))

    # Agregar provinciales específicas
    if prov_key in PROVINCIALES_2027:
        for p in PROVINCIALES_2027[prov_key]:
            if str(p["lista"]) not in prov_lista_set:
                orgs_prov.append(p)
                prov_lista_set.add(str(p["lista"]))

    # Ordenar organizaciones de la provincia por lista
    prov_data["organizaciones"] = sorted(
        orgs_prov,
        key=lambda x: int(str(x.get("lista", "999")).split("-")[0]) if str(x.get("lista", "")).split("-")[0].isdigit() else 999
    )
    prov_data["total"] = len(prov_data["organizaciones"])

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Actualizado {JSON_PATH}: {len(data['nacionales'])} organizaciones nacionales y 24 provincias.")

