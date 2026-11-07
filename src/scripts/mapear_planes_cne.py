"""
Recorre el catálogo público de Voto Informado (proceso 140) y escribe un índice
liviano de planes: dignidad, territorio, organización y la URL PlanTrabajo.

No descarga PDF ni texto. Se puede reanudar: cada formulario ya guardado se omite.
"""

from __future__ import annotations

import json
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
OUT_JSONL = BASE_DIR / "public" / "data" / "cne" / "indice_planes_api.jsonl"
OUT_META = BASE_DIR / "public" / "data" / "cne" / "indice_planes_api_meta.json"
ERR_JSONL = BASE_DIR / "public" / "data" / "cne" / "indice_planes_api_errores.jsonl"

PROCESO = 140
VI_BASE = "https://backend-apps.cne.gob.ec/vi/api/Catalogos"
SARE_BASE = "https://backend-apps.cne.gob.ec/sare-consulta/api"
PLAN_URL = "https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/{proceso}/{formulario}/{plan}"
AUTH_VI = "https://votoinformado.cne.gob.ec/voto-informado/api/auth-vi"
AUTH_SARE = "https://votoinformado.cne.gob.ec/voto-informado/api/auth"
ORIGIN = "https://votoinformado.cne.gob.ec"

DIGNIDADES = {
    2: ("Prefecto", ("provincia",)),
    4: ("Alcalde", ("provincia", "canton")),
    3: ("Concejal", ("provincia", "canton")),
    5: ("Concejal", ("provincia", "canton")),
    6: ("Vocal Junta Parroquial", ("provincia", "canton", "parroquia")),
    12: ("Concejal", ("provincia", "canton", "circunscripcion")),
}

SUBTIPO = {
    2: "Prefecto y viceprefecto",
    3: "Concejales rurales",
    4: "Alcalde",
    5: "Concejales urbanos",
    6: "Vocales de junta parroquial rural",
    12: "Concejales urbanos por circunscripcion",
}

WORKERS = 6
_print_lock = threading.Lock()
_file_lock = threading.Lock()


def log(msg: str) -> None:
    with _print_lock:
        print(msg, flush=True)


def audit(desc: str) -> dict:
    return {
        "usuario": 1,
        "proceso": 1,
        "ip": "0.0.0.0",
        "navegador": "hackaton-social-mapper",
        "tipoRequest": "C",
        "descripcionRequest": desc,
        "servidor": "web",
    }


class TokenJar:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.vi = ""
        self.sare = ""
        self.vi_at = 0.0
        self.sare_at = 0.0

    def vi_token(self) -> str:
        with self._lock:
            if not self.vi or time.time() - self.vi_at > 3000:
                self.vi = fetch_token(AUTH_VI, "VotoInformado", "VotoInformadoApi")
                self.vi_at = time.time()
            return self.vi

    def sare_token(self) -> str:
        with self._lock:
            if not self.sare or time.time() - self.sare_at > 3000:
                self.sare = fetch_token(AUTH_SARE, "sare", "sareApi")
                self.sare_at = time.time()
            return self.sare

    def invalidate(self, kind: str) -> None:
        with self._lock:
            if kind == "vi":
                self.vi = ""
            else:
                self.sare = ""


TOKENS = TokenJar()


def fetch_token(url: str, client_id: str, scope: str) -> str:
    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "scope": scope,
        }
    ).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Origin": ORIGIN,
            "User-Agent": "hackaton-social-mapper",
        },
    )
    with urllib.request.urlopen(req, timeout=40) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    token = payload.get("access_token") or ""
    if not token:
        raise RuntimeError(f"Sin token de {url}")
    return token


def request_json(url: str, body: dict, kind: str, retries: int = 4) -> dict | list:
    last_error = ""
    for attempt in range(retries):
        token = TOKENS.vi_token() if kind == "vi" else TOKENS.sare_token()
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}",
                "Origin": ORIGIN,
                "User-Agent": "hackaton-social-mapper",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:300]
            last_error = f"HTTP {exc.code} {detail}"
            if exc.code == 401:
                TOKENS.invalidate(kind)
            if exc.code in (401, 429, 500, 502, 503, 504):
                time.sleep(0.8 * (attempt + 1))
                continue
            raise RuntimeError(last_error) from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = str(exc)
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(last_error or "request failed")


def unwrap(payload) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return [data]
    return []


def pick(obj: dict, *keys: str, default=""):
    for key in keys:
        value = obj.get(key)
        if value not in (None, ""):
            return value
    return default


def list_provincias() -> list[dict]:
    payload = request_json(
        f"{SARE_BASE}/Provincia/ListarProvinciasPorProceso",
        {"codigoProceso": PROCESO, "auditoria": audit("provincias")},
        "sare",
    )
    rows = unwrap(payload)
    provincias = []
    for row in rows:
        provincias.append(
            {
                "codigo": int(pick(row, "codigoProvincia", "codProvincia", "codigo", "id", default=0)),
                "nombre": str(pick(row, "nombreProvincia", "nomProvincia", "nombre", "descripcion", default="")).strip(),
            }
        )
    return [p for p in provincias if p["codigo"]]


def list_cantones(cod_provincia: int) -> list[dict]:
    payload = request_json(
        f"{SARE_BASE}/Canton/ListarCantonesPorProceso",
        {
            "codigoProceso": PROCESO,
            "codigoProvincia": cod_provincia,
            "auditoria": audit("cantones"),
        },
        "sare",
    )
    cantones = []
    for row in unwrap(payload):
        cantones.append(
            {
                "codigo": int(pick(row, "codigoCanton", "codCanton", "codigo", "id", default=0)),
                "nombre": str(pick(row, "nombreCanton", "nomCanton", "nombre", "descripcion", default="")).strip(),
            }
        )
    return [c for c in cantones if c["codigo"]]


def list_parroquias(cod_canton: int) -> list[dict]:
    payload = request_json(
        f"{SARE_BASE}/Parroquia/ListarParroquiasPorProceso",
        {
            "codigoProceso": PROCESO,
            "codigoCanton": cod_canton,
            "auditoria": audit("parroquias"),
        },
        "sare",
    )
    parroquias = []
    for row in unwrap(payload):
        ambito = str(pick(row, "ambito", "codAmbito", "tipo", default="")).upper()
        parroquias.append(
            {
                "codigo": int(pick(row, "codigoParroquia", "codParroquia", "codigo", "id", default=0)),
                "nombre": str(pick(row, "nombreParroquia", "nomParroquia", "nombre", "descripcion", default="")).strip(),
                "ambito": ambito,
            }
        )
    return [p for p in parroquias if p["codigo"]]


def list_circunscripciones(cod_canton: int) -> list[dict]:
    payload = request_json(
        f"{SARE_BASE}/Circunscripcion/ListarCircunscripcionesPorProceso",
        {
            "codigoTipo": 2,
            "codigoProceso": PROCESO,
            "codigoJurisdiccion": cod_canton,
            "auditoria": audit("circunscripciones"),
        },
        "sare",
    )
    circs = []
    for row in unwrap(payload):
        circs.append(
            {
                "codigo": int(pick(row, "codigoCircunscripcion", "codCircunscripcion", "codigo", "id", default=0)),
                "nombre": str(
                    pick(row, "nombreCircunscripcion", "nomCircunscripcion", "nombre", "descripcion", default="")
                ).strip(),
            }
        )
    return [c for c in circs if c["codigo"]]


def organizaciones(cod_dignidad: int, provincia: int, canton: int = 0, parroquia: int = 0, circunscripcion: int = 0) -> list[dict]:
    payload = request_json(
        f"{VI_BASE}/OrganizacionesPoliticas",
        {
            "codProceso": PROCESO,
            "codDignidad": cod_dignidad,
            "codProvincia": provincia,
            "codCanton": canton,
            "codParroquia": parroquia,
            "codCircunscripcion": circunscripcion,
            "auditoria": audit("organizaciones"),
        },
        "vi",
    )
    return unwrap(payload)


def candidatos_formulario(cod_formulario: int) -> dict:
    payload = request_json(
        f"{VI_BASE}/CandidatosFormulario",
        {
            "codProceso": PROCESO,
            "codFormulario": cod_formulario,
            "auditoria": audit("candidatos"),
        },
        "vi",
    )
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else {}


def nombre_candidato(row: dict) -> str:
    return str(pick(row, "nomCandidato", "nomPapeleta", "nombre", default="")).strip()


def fila_plan(org: dict, lugar: dict, plan: dict | None, principales: list, suplentes: list) -> dict:
    cod_formulario = int(pick(org, "codFormulario", default=0))
    cod_plan = int(pick(plan or {}, "codPlanTrabajo", default=0))
    cabeza = nombre_candidato(principales[0]) if principales else ""
    alterno = ""
    if suplentes:
        alterno = nombre_candidato(suplentes[0])
    elif len(principales) > 1:
        alterno = nombre_candidato(principales[1])
    archivo = str(pick(plan or {}, "urlPlanTrabajo", default="") or "")
    return {
        "proceso": PROCESO,
        "cod_dignidad": lugar["cod_dignidad"],
        "dignidad": lugar["dignidad"],
        "subtipo": lugar["subtipo"],
        "cod_provincia": lugar["cod_provincia"],
        "provincia": lugar["provincia"],
        "cod_canton": lugar.get("cod_canton") or 0,
        "canton": lugar.get("canton") or "",
        "cod_parroquia": lugar.get("cod_parroquia") or 0,
        "parroquia": lugar.get("parroquia") or "",
        "cod_circunscripcion": lugar.get("cod_circunscripcion") or 0,
        "circunscripcion": lugar.get("circunscripcion") or "",
        "cod_formulario": cod_formulario,
        "cod_plan": cod_plan,
        "tiene_plan": cod_plan > 0,
        "url_plan": PLAN_URL.format(proceso=PROCESO, formulario=cod_formulario, plan=cod_plan) if cod_plan else "",
        "archivo": archivo,
        "md5": str(pick(plan or {}, "md5Hash", default="") or ""),
        "organizacion": str(pick(org, "nomPartido", default="") or "").strip(),
        "lista": str(pick(org, "lisPartido", default="") or "").strip(),
        "candidato": cabeza,
        "alterno": alterno,
        "n_principales": len(principales),
        "n_suplentes": len(suplentes),
    }


def load_done() -> set[int]:
    done: set[int] = set()
    if not OUT_JSONL.exists():
        return done
    with OUT_JSONL.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            cod = int(row.get("cod_formulario") or 0)
            if cod:
                done.add(cod)
    return done


def append_rows(rows: list[dict]) -> None:
    if not rows:
        return
    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with _file_lock:
        with OUT_JSONL.open("a", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def append_error(item: dict) -> None:
    ERR_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with _file_lock:
        with ERR_JSONL.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(item, ensure_ascii=False) + "\n")


def procesar_organizacion(org: dict, lugar: dict, done: set[int]) -> list[dict]:
    cod_formulario = int(pick(org, "codFormulario", default=0))
    if not cod_formulario or cod_formulario in done:
        return []
    detalle = candidatos_formulario(cod_formulario)
    principales = detalle.get("principales") or []
    suplentes = detalle.get("suplentes") or []
    planes = detalle.get("planesTrabajo") or []
    if not planes:
        return [fila_plan(org, lugar, None, principales, suplentes)]
    return [fila_plan(org, lugar, plan, principales, suplentes) for plan in planes]


def trabajos_de(lugar: dict) -> list[tuple[dict, dict]]:
    orgs = organizaciones(
        lugar["cod_dignidad"],
        lugar["cod_provincia"],
        lugar.get("cod_canton") or 0,
        lugar.get("cod_parroquia") or 0,
        lugar.get("cod_circunscripcion") or 0,
    )
    return [(org, lugar) for org in orgs]


def descubrir() -> None:
    provincias = list_provincias()
    log(f"Provincias: {len(provincias)}")
    if provincias:
        log("Ejemplo provincia: " + json.dumps(provincias[0], ensure_ascii=False))
    bolivar = next((p for p in provincias if p["codigo"] == 2 or "BOL" in p["nombre"].upper()), provincias[0] if provincias else None)
    if not bolivar:
        return
    cantones = list_cantones(bolivar["codigo"])
    log(f"Cantones de {bolivar['nombre']}: {len(cantones)}")
    if cantones:
        log("Ejemplo canton: " + json.dumps(cantones[0], ensure_ascii=False))
        parroquias = list_parroquias(cantones[0]["codigo"])
        log(f"Parroquias de {cantones[0]['nombre']}: {len(parroquias)}")
        if parroquias:
            log("Ejemplo parroquia: " + json.dumps(parroquias[0], ensure_ascii=False))
        circs = list_circunscripciones(cantones[0]["codigo"])
        log(f"Circunscripciones de {cantones[0]['nombre']}: {len(circs)}")
    orgs = organizaciones(2, bolivar["codigo"])
    log(f"Prefectura {bolivar['nombre']}: {len(orgs)} organizaciones")
    if orgs:
        cod = int(orgs[0]["codFormulario"])
        detalle = candidatos_formulario(cod)
        planes = detalle.get("planesTrabajo") or []
        log(
            "Formulario "
            + str(cod)
            + " principales="
            + str(len(detalle.get("principales") or []))
            + " planes="
            + str(len(planes))
        )
        if planes:
            log("Plan keys: " + ", ".join(planes[0].keys()))


def construir_cola(solo_provincia: int | None) -> list[dict]:
    provincias = list_provincias()
    if solo_provincia:
        provincias = [p for p in provincias if p["codigo"] == solo_provincia]
    log(f"Provincias a recorrer: {len(provincias)}")
    cola: list[dict] = []
    for provincia in provincias:
        cola.append(
            {
                "cod_dignidad": 2,
                "dignidad": DIGNIDADES[2][0],
                "subtipo": SUBTIPO[2],
                "cod_provincia": provincia["codigo"],
                "provincia": provincia["nombre"],
            }
        )
        cantones = list_cantones(provincia["codigo"])
        log(f"  {provincia['nombre']}: {len(cantones)} cantones")
        for canton in cantones:
            for cod_dignidad in (4, 3, 5):
                cola.append(
                    {
                        "cod_dignidad": cod_dignidad,
                        "dignidad": DIGNIDADES[cod_dignidad][0],
                        "subtipo": SUBTIPO[cod_dignidad],
                        "cod_provincia": provincia["codigo"],
                        "provincia": provincia["nombre"],
                        "cod_canton": canton["codigo"],
                        "canton": canton["nombre"],
                    }
                )
            try:
                circs = list_circunscripciones(canton["codigo"])
            except RuntimeError as exc:
                append_error({"donde": "circunscripcion", "canton": canton, "error": str(exc)})
                circs = []
            for circ in circs:
                cola.append(
                    {
                        "cod_dignidad": 12,
                        "dignidad": DIGNIDADES[12][0],
                        "subtipo": SUBTIPO[12],
                        "cod_provincia": provincia["codigo"],
                        "provincia": provincia["nombre"],
                        "cod_canton": canton["codigo"],
                        "canton": canton["nombre"],
                        "cod_circunscripcion": circ["codigo"],
                        "circunscripcion": circ["nombre"],
                    }
                )
            try:
                parroquias = list_parroquias(canton["codigo"])
            except RuntimeError as exc:
                append_error({"donde": "parroquia", "canton": canton, "error": str(exc)})
                parroquias = []
            for parroquia in parroquias:
                cola.append(
                    {
                        "cod_dignidad": 6,
                        "dignidad": DIGNIDADES[6][0],
                        "subtipo": SUBTIPO[6],
                        "cod_provincia": provincia["codigo"],
                        "provincia": provincia["nombre"],
                        "cod_canton": canton["codigo"],
                        "canton": canton["nombre"],
                        "cod_parroquia": parroquia["codigo"],
                        "parroquia": parroquia["nombre"],
                    }
                )
    return cola


def mapear(solo_provincia: int | None) -> None:
    done = load_done()
    log(f"Formularios ya guardados: {len(done)}")
    cola = construir_cola(solo_provincia)
    log(f"Jurisdicciones a consultar: {len(cola)}")
    pares: list[tuple[dict, dict]] = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(trabajos_de, lugar) for lugar in cola]
        for index, future in enumerate(as_completed(futures), start=1):
            try:
                pares.extend(future.result())
            except Exception as exc:
                append_error({"donde": "organizaciones", "error": str(exc)})
            if index % 100 == 0:
                log(f"  jurisdicciones consultadas {index}/{len(cola)} · listas {len(pares)}")
    pendientes = [(org, lugar) for org, lugar in pares if int(pick(org, "codFormulario", default=0)) not in done]
    log(f"Listas encontradas: {len(pares)} · pendientes de formulario: {len(pendientes)}")
    guardados = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(procesar_organizacion, org, lugar, done) for org, lugar in pendientes]
        for index, future in enumerate(as_completed(futures), start=1):
            try:
                rows = future.result()
            except Exception as exc:
                append_error({"donde": "formulario", "error": str(exc)})
                continue
            append_rows(rows)
            for row in rows:
                done.add(int(row["cod_formulario"]))
            guardados += len(rows)
            if index % 100 == 0:
                log(f"  formularios {index}/{len(pendientes)} · filas nuevas {guardados}")
    escribir_meta()
    log(f"Listo. Filas nuevas: {guardados}. Archivo: {OUT_JSONL}")


def escribir_meta() -> None:
    total = 0
    con_plan = 0
    por_dignidad: dict[str, int] = {}
    if OUT_JSONL.exists():
        with OUT_JSONL.open(encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                total += 1
                row = json.loads(line)
                if row.get("tiene_plan"):
                    con_plan += 1
                key = row.get("subtipo") or row.get("dignidad") or "?"
                por_dignidad[key] = por_dignidad.get(key, 0) + 1
    meta = {
        "proceso": PROCESO,
        "titulo": "ELECCIONES SECCIONALES Y CPCCS 2027",
        "total_listas": total,
        "listas_con_plan": con_plan,
        "listas_sin_plan": total - con_plan,
        "por_subtipo": por_dignidad,
        "archivo": "public/data/cne/indice_planes_api.jsonl",
        "url_plantilla": PLAN_URL,
    }
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    log(json.dumps(meta, ensure_ascii=False))


def main() -> None:
    args = sys.argv[1:]
    if "descubrir" in args:
        descubrir()
        return
    solo = None
    if "--provincia" in args:
        solo = int(args[args.index("--provincia") + 1])
    mapear(solo)


if __name__ == "__main__":
    main()
