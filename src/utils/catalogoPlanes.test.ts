import { describe, expect, it } from 'vitest';
import { buscarCatalogo, type FilaPlan } from './catalogoPlanes';

function fila(partial: Partial<FilaPlan>): FilaPlan {
  return {
    proceso: 140,
    cod_dignidad: 0,
    dignidad: '',
    subtipo: '',
    cod_provincia: 0,
    provincia: '',
    cod_canton: 0,
    canton: '',
    cod_parroquia: 0,
    parroquia: '',
    cod_circunscripcion: 0,
    circunscripcion: '',
    cod_formulario: 1,
    cod_plan: 1,
    tiene_plan: true,
    url_plan: '',
    archivo: '',
    organizacion: '',
    lista: '1',
    candidato: 'PERSONA DE PRUEBA',
    alterno: '',
    n_principales: 1,
    n_suplentes: 0,
    ...partial,
  };
}

const catalogo = [
  fila({
    cod_dignidad: 2,
    dignidad: 'Prefecto',
    subtipo: 'Prefecto y viceprefecto',
    cod_provincia: 2,
    provincia: 'BOLIVAR',
    cod_formulario: 20,
  }),
  fila({
    cod_dignidad: 4,
    dignidad: 'Alcalde',
    subtipo: 'Alcalde',
    cod_provincia: 4,
    provincia: 'CARCHI',
    cod_canton: 25,
    canton: 'BOLIVAR',
    cod_formulario: 40,
  }),
];

describe('búsqueda territorial sin colisiones', () => {
  it('prefectura de Bolívar abre la provincia Bolívar', () => {
    const resultado = buscarCatalogo(catalogo, 'prefectura de Bolívar')[0];
    expect(resultado).toMatchObject({ cod_provincia: 2, cod_canton: 0, subtipo: 'Prefecto y viceprefecto' });
  });

  it('alcalde de Bolívar abre el cantón Bolívar de Carchi', () => {
    const resultado = buscarCatalogo(catalogo, 'alcalde de Bolívar')[0];
    expect(resultado).toMatchObject({ cod_provincia: 4, cod_canton: 25, subtipo: 'Alcalde' });
  });
});
