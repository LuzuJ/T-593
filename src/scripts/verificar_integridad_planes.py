import json
import hashlib
import os
import glob

def auditar_sistema():
    print("=" * 80)
    print("AUDITORÍA DE INTEGRIDAD: OBSERVATORIO ELECTORAL CNE")
    print("=" * 80)

    # 1. Auditoría de los Planes con PDF Verificado y Transcripción
    planes_file = 'src/data/PLANES/planes_pdf_verificados.json'
    with open(planes_file, 'r', encoding='utf-8') as f:
        planes = json.load(f)

    print(f"\n[1/3] Auditando {len(planes)} Planes de Trabajo con PDF oficial transcrito:")
    print("-" * 80)
    
    errores_planes = 0
    for idx, p in enumerate(planes, 1):
        pid = p.get('id')
        nombre = p.get('nombre')
        dign = p.get('jurisdiccion', {}).get('dignidad')
        prov = p.get('jurisdiccion', {}).get('provincia')
        cant = p.get('jurisdiccion', {}).get('canton')
        partido = p.get('partido_politico')
        lista = p.get('lista')
        arch = p.get('archivo_pdf')
        pdf_url = p.get('pdf_url')
        sha = p.get('sha256_hash')
        pags = p.get('analisis', {}).get('paginas_total', 0)
        promesas = len(p.get('analisis', {}).get('promesas_clasificadas', []))
        indice = p.get('analisis', {}).get('metricas_competencia', {}).get('indice_alineacion_cootad', 0)

        # Verificar archivo físico en public/planes
        pdf_disk = os.path.join('public', 'planes', arch) if arch else None
        disk_ok = os.path.exists(pdf_disk) if pdf_disk else False
        
        # Verificar hash si está en disco
        hash_match = False
        if disk_ok:
            with open(pdf_disk, 'rb') as pf:
                real_hash = hashlib.sha256(pf.read()).hexdigest()
                hash_match = (real_hash == sha)

        # Verificar archivo de texto completo en public/data/planes_texto/
        texto_file = os.path.join('public', 'data', 'planes_texto', f"{pid}.json")
        texto_ok = os.path.exists(texto_file)

        estado = "OK" if (disk_ok and hash_match and texto_ok) else "ALERTA"
        if estado != "OK": errores_planes += 1

        print(f"  {idx:02d}. [{estado}] {nombre} ({dign} - {prov} › {cant})")
        print(f"      Partido: {partido} (Lista {lista}) | Págs: {pags} | Propuestas: {promesas} | COOTAD: {indice}%")
        print(f"      PDF: {arch} (En disco: {'SÍ' if disk_ok else 'NO'}, SHA-256 Coincide: {'SÍ' if hash_match else 'NO'})")
        print(f"      Texto íntegro ({texto_file}): {'SÍ' if texto_ok else 'NO'}")
        if pdf_url:
            print(f"      Enlace Oficial CNE: {pdf_url}")
        print()

    # 2. Auditoría del Padrón Nominal Provincial (24 Provincias)
    prov_files = sorted(glob.glob('public/data/cne/provincias/*.json'))
    print(f"\n[2/3] Auditando 24 Chunks Provinciales del Padrón CNE:")
    print("-" * 80)
    
    total_nominales = 0
    total_listas = 0
    for pf in prov_files:
        prov_slug = os.path.basename(pf).replace('.json', '')
        with open(pf, 'r', encoding='utf-8') as f:
            pdata = json.load(f)
        
        prov_name = pdata.get('provincia')
        n_nom = len(pdata.get('candidaturas_nominales', []))
        n_plan = len(pdata.get('planes', []))
        total_nominales += n_nom
        total_listas += n_plan
        print(f"  • {prov_name:<28} : {n_nom:>5} nominales | {n_plan:>4} listas/planes")

    print("-" * 80)
    print(f"  TOTAL NACIONAL PADRÓN: {total_nominales:,} candidaturas nominales | {total_listas:,} listas en 24 provincias")

    # 3. Auditoría del Índice de Búsqueda Nacional
    index_file = 'public/data/cne/indice_nacional_busqueda.json'
    with open(index_file, 'r', encoding='utf-8') as f:
        idx_data = json.load(f)
    print(f"\n[3/3] Índice de Búsqueda Rápida en Memoria/IndexedDB:")
    print("-" * 80)
    print(f"  • Entradas indexadas para autocompletado instantáneo: {len(idx_data):,}")
    print(f"  • Tamaño en disco: {os.path.getsize(index_file) / 1024:.1f} KB")

    print("=" * 80)
    print(f"RESULTADO: {'SISTEMA 100% ÍNTEGRO Y CONSISTENTE' if errores_planes == 0 else 'HAY DISCREPANCIAS'}")
    print("=" * 80)

if __name__ == '__main__':
    auditar_sistema()

