import pandas as pd
import json
import unicodedata

def normalize_key(text):
    if not isinstance(text, str):
        return ''
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.strip().upper()

excel_path = r'd:\PERSONAL PROJECTS\HACKATON SOCIAL\src\data\Organizaciones-politicas-2023.xlsx'
df = pd.read_excel(excel_path, sheet_name='Organizaciones')

# Clean columns
df['prov_norm'] = df['OP_PROVINCIA_NOMBRE'].apply(normalize_key)
canton_col = [c for c in df.columns if 'canton_nombre' in c.lower()][0]
df['canton_norm'] = df[canton_col].apply(normalize_key)

# Partidos Nacionales
nacionales = []
df_nac = df[df['OP_AMBITO'] == 'NACIONAL']
for _, r in df_nac.iterrows():
    nacionales.append({
        'codigo': int(r['OP_CODIGO']) if pd.notna(r['OP_CODIGO']) else None,
        'nombre': str(r['OP_NOMBRE']).strip(),
        'siglas': str(r['OP_SIGLAS']).strip() if pd.notna(r['OP_SIGLAS']) else '',
        'lista': str(r['OP_LISTA']).strip() if pd.notna(r['OP_LISTA']) else '',
        'tipo': str(r['OP_TIPO']).strip(),
        'ambito': 'NACIONAL'
    })

# Organizaciones por provincia
provincias_dict = {}
for prov, pgroup in df.groupby('prov_norm'):
    if not prov or prov == 'ECUADOR':
        continue
    
    orgs_prov = []
    cantones_dict = {}
    
    for _, r in pgroup.iterrows():
        org_item = {
            'codigo': int(r['OP_CODIGO']) if pd.notna(r['OP_CODIGO']) else None,
            'nombre': str(r['OP_NOMBRE']).strip(),
            'siglas': str(r['OP_SIGLAS']).strip() if pd.notna(r['OP_SIGLAS']) else '',
            'lista': str(r['OP_LISTA']).strip() if pd.notna(r['OP_LISTA']) else '',
            'tipo': str(r['OP_TIPO']).strip(),
            'ambito': str(r['OP_AMBITO']).strip(),
            'canton': str(r[canton_col]).strip() if pd.notna(r[canton_col]) else ''
        }
        orgs_prov.append(org_item)
        
        cant = r['canton_norm']
        if cant:
            if cant not in cantones_dict:
                cantones_dict[cant] = []
            cantones_dict[cant].append(org_item)

    provincias_dict[prov] = {
        'total': len(orgs_prov),
        'organizaciones': orgs_prov,
        'cantones': cantones_dict
    }

output_data = {
    'total_registros': len(df),
    'nacionales': nacionales,
    'provincias': provincias_dict
}

out_path = r'd:\PERSONAL PROJECTS\HACKATON SOCIAL\src\data\organizaciones_politicas_2023.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f'Procesadas {len(df)} organizaciones.')
print(f'Provincias: {len(provincias_dict)}')
print(f'Nacionales: {len(nacionales)}')
print('Pichincha:', len(provincias_dict.get('PICHINCHA', {}).get('organizaciones', [])), 'organizaciones')
