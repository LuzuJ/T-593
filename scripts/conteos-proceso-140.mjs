import { readFileSync, writeFileSync } from 'node:fs';

const lines = readFileSync('public/data/cne/indice_planes_api.jsonl', 'utf8').trim().split('\n');

function clave(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function vacio() {
  return {
    total: 0,
    prefectura: 0,
    alcaldia: 0,
    concejales: 0,
    juntas_parroquiales: 0,
    organizaciones: new Set(),
  };
}

function grupo(subtipo) {
  if (subtipo.startsWith('Prefecto')) return 'prefectura';
  if (subtipo.startsWith('Alcalde')) return 'alcaldia';
  if (subtipo.startsWith('Vocal')) return 'juntas_parroquiales';
  if (subtipo.startsWith('Concejal')) return 'concejales';
  return '';
}

function sumar(destino, fila) {
  destino.total += 1;
  const campo = grupo(fila.subtipo);
  if (campo) destino[campo] += 1;
  const organizacion = (fila.organizacion || '').replace(/\s+/g, ' ').trim();
  if (organizacion) destino.organizaciones.add(organizacion);
}

const nacional = vacio();
const provincias = new Map();

for (const line of lines) {
  const fila = JSON.parse(line);
  sumar(nacional, fila);
  const provincia = clave(fila.provincia);
  if (!provincias.has(provincia)) provincias.set(provincia, { conteo: vacio(), cantones: new Map() });
  const actual = provincias.get(provincia);
  sumar(actual.conteo, fila);
  if (fila.canton) {
    const canton = clave(fila.canton);
    if (!actual.cantones.has(canton)) actual.cantones.set(canton, vacio());
    sumar(actual.cantones.get(canton), fila);
  }
}

function publicar(conteo) {
  return {
    total: conteo.total,
    prefectura: conteo.prefectura,
    alcaldia: conteo.alcaldia,
    concejales: conteo.concejales,
    juntas_parroquiales: conteo.juntas_parroquiales,
    organizaciones: conteo.organizaciones.size,
  };
}

const salida = {
  proceso: 140,
  titulo: 'ELECCIONES SECCIONALES Y CPCCS 2027',
  fuente: 'indice_planes_api.jsonl',
  unidad: 'listas inscritas',
  nacional: publicar(nacional),
  provincias: Object.fromEntries(
    [...provincias.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([nombre, valor]) => [
        nombre,
        {
          ...publicar(valor.conteo),
          cantones: Object.fromEntries(
            [...valor.cantones.entries()]
              .sort(([a], [b]) => a.localeCompare(b, 'es'))
              .map(([canton, conteo]) => [canton, publicar(conteo)])
          ),
        },
      ])
  ),
};

writeFileSync('src/data/conteos_proceso_140.json', JSON.stringify(salida));
console.log(salida.nacional);
console.log(Object.keys(salida.provincias).join(' | '));
