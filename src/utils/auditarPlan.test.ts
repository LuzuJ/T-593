import { describe, expect, it } from 'vitest';
import { auditarPaginas, type PaginaAuditada } from './auditarPlan';

describe('auditoría ciudadana con evidencia', () => {
  it('descarta el índice y conserva la página de una oferta concreta', () => {
    const paginas: PaginaAuditada[] = [
      {
        pagina: 1,
        tipo: 'indice',
        tieneTexto: true,
        texto: '2.2 Planes, programas y proyectos 3.1 Movilidad 3.2 Mercado municipal 12',
      },
      {
        pagina: 2,
        tipo: 'propuestas',
        tieneTexto: true,
        texto:
          'PROPUESTAS Y PROYECTOS\nImplementar un nuevo mercado municipal para ordenar el comercio y mejorar el servicio de faenamiento del cantón.',
      },
    ];

    const resultado = auditarPaginas(paginas, 'Alcalde', 2);

    expect(resultado.paginasProcesadas).toBe(2);
    expect(resultado.conteos.totalOfertas).toBe(1);
    expect(resultado.conteos.dentroCompetencia).toBe(1);
    expect(resultado.promesas[0]).toMatchObject({
      pagina: 2,
      viable: 'Sí',
      tema: 'Mercados y faenamiento',
      articulo: 'COOTAD Art. 55',
    });
    expect(resultado.promesas[0].promesa).not.toContain('2.2 Planes');
  });

  it('no asigna calificación cuando el PDF no contiene texto extraíble', () => {
    const resultado = auditarPaginas(
      [{ pagina: 1, texto: '', tipo: 'portada', tieneTexto: false }],
      'Prefecto',
      1
    );

    expect(resultado.sinTexto).toBe(true);
    expect(resultado.conteos.totalOfertas).toBe(0);
    expect(resultado.aviso).toContain('No se asignó ninguna calificación');
  });

  it('distingue coordinación y competencia de otro nivel', () => {
    const resultado = auditarPaginas(
      [
        {
          pagina: 4,
          tipo: 'propuestas',
          tieneTexto: true,
          texto:
            'PLAN DE ACCIÓN\nImplementar programas de salud preventiva mediante convenios con el Ministerio de Salud.\nConstruir un sistema provincial de riego para las comunidades rurales.',
        },
      ],
      'Alcalde',
      4
    );

    expect(resultado.conteos.requiereCoordinacion).toBe(1);
    expect(resultado.conteos.otroNivel).toBe(1);
    expect(resultado.promesas.map((item) => item.pagina)).toEqual([4, 4]);
  });

  it('no trata agricultura como cultura ni una coordinación policial como competencia nacional', () => {
    const resultado = auditarPaginas(
      [
        {
          pagina: 6,
          tipo: 'propuestas',
          tieneTexto: true,
          texto:
            'PLAN DE ACCIÓN\nFortalecer la agricultura y el fomento productivo de la provincia.\nEstablecer mecanismos de coordinación con la Policía Nacional para la prevención.\nCrear un comando policial municipal con cédula 1712345678.',
        },
      ],
      'Prefecto',
      6
    );

    const temas = resultado.promesas.map((item) => item.tema);
    expect(temas).not.toContain('Otra oferta');
    expect(resultado.promesas.some((item) => item.tema === 'Cultura' || item.evidencia === 'cultura')).toBe(false);
    const policial = resultado.promesas.find((item) => item.evidencia === 'policia nacional');
    expect(policial?.viable).toBe('Parcial');
    expect(policial?.articulo).not.toContain('261');
    expect(resultado.promesas.some((item) => item.promesa.includes('1712345678'))).toBe(false);
    expect(resultado.promesas.some((item) => item.promesa.includes('[dato reservado]'))).toBe(true);
  });

  it('no archiva bajo un solo tema una frase que mezcla dos materias', () => {
    const resultado = auditarPaginas(
      [
        {
          pagina: 8,
          tipo: 'propuestas',
          tieneTexto: true,
          texto:
            'PLAN DE ACCIÓN\nImplementar un centro de salud junto al nuevo mercado municipal para ordenar el comercio del cantón.',
        },
      ],
      'Alcalde',
      8
    );

    expect(resultado.promesas).toHaveLength(1);
    expect(resultado.promesas[0].tema).toBe('Varios temas');
    expect(resultado.conteos.dentroCompetencia).toBe(0);
    expect(resultado.conteos.requiereCoordinacion).toBe(0);
  });
});
