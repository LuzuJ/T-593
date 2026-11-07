import json
import glob
import os

def generar_indice():
    index_entries = []
    prov_files = glob.glob('public/data/cne/provincias/*.json')
    print(f"Procesando {len(prov_files)} provincias...")

    for pf in sorted(prov_files):
        prov_slug = os.path.basename(pf).replace('.json', '')
        with open(pf, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        prov_nombre = data.get('provincia', prov_slug.replace('_', ' ').title())

        # 1. Indexar planes (cabeza de lista, alcaldes, prefectos)
        for p in data.get('planes', []):
            nombre = p.get('nombre', '').strip()
            if not nombre:
                continue
            canton = p.get('jurisdiccion', {}).get('canton', '')
            dign = p.get('jurisdiccion', {}).get('dignidad', '')
            partido = p.get('siglas') or p.get('partido_politico', '')
            lista = p.get('lista', '')
            has_pdf = bool(p.get('archivo_pdf') or p.get('sha256_hash'))
            
            # Formato ultra compacto:
            # [nombre, prov_slug, prov_nombre, canton, dign, partido, lista, plan_id, has_pdf (1/0)]
            index_entries.append([
                nombre,
                prov_slug,
                prov_nombre,
                canton,
                dign,
                partido,
                lista,
                p.get('id', ''),
                1 if has_pdf else 0
            ])

        # 2. Indexar nominales relevantes (principales no repetidos)
        seen_names = set(p.get('nombre', '').strip().upper() for p in data.get('planes', []))
        for c in data.get('candidaturas_nominales', []):
            prin = c.get('principal', '').strip()
            if not prin or prin.upper() in seen_names or prin == 'SIN REGISTRO OFICIAL':
                continue
            seen_names.add(prin.upper())
            canton = c.get('canton', '')
            dign = c.get('dignidad', '')
            partido = c.get('siglas') or c.get('partido', '')
            lista = c.get('lista', '')
            index_entries.append([
                prin,
                prov_slug,
                prov_nombre,
                canton,
                dign,
                partido,
                lista,
                '',
                0
            ])

    out_path = 'public/data/cne/indice_nacional_busqueda.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(index_entries, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Indice generado exitosamente con {len(index_entries)} entradas en {out_path}")
    print(f"Tamano archivo: {os.path.getsize(out_path) / 1024:.1f} KB")

if __name__ == '__main__':
    generar_indice()

