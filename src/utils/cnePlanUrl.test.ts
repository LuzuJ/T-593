import { describe, expect, it } from 'vitest';
import {
  buildCnePlanDirectUrl,
  buildCnePlanProxyUrl,
  getLocalPlanUrl,
  getPdfCandidateSources,
  normalizeProxyBase,
} from './cnePlanUrl';

describe('cnePlanUrl', () => {
  it('normaliza el prefijo del proxy removiendo barras finales', () => {
    expect(normalizeProxyBase('')).toBe('/cne-plan');
    expect(normalizeProxyBase('/cne-plan/')).toBe('/cne-plan');
    expect(normalizeProxyBase('https://proxy.ejemplo.com/cne/')).toBe('https://proxy.ejemplo.com/cne');
  });

  it('construye URLs de proxy y directas solo con IDs válidos', () => {
    expect(buildCnePlanProxyUrl(140, 11349, 2941, '/cne-plan')).toBe('/cne-plan/140/11349/2941');
    expect(buildCnePlanDirectUrl(140, 11349, 2941)).toBe(
      'https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/140/11349/2941'
    );
    expect(buildCnePlanProxyUrl(0, 11349, 2941)).toBeNull();
    expect(buildCnePlanDirectUrl(140, -1, 2941)).toBeNull();
  });

  it('ordena las fuentes candidatas sin duplicados y valida rutas locales', () => {
    expect(getLocalPlanUrl('/planes/plan_1.pdf')).toBe('/planes/plan_1.pdf');
    expect(getLocalPlanUrl('/planes/../secreto.pdf')).toBeNull();

    const fuentes = getPdfCandidateSources(
      {
        proceso: 140,
        cod_formulario: 11349,
        cod_plan: 2941,
        url_plan: 'https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/140/11349/2941',
      },
      '/cne-plan'
    );

    expect(fuentes).toEqual([
      '/cne-plan/140/11349/2941',
      'https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/140/11349/2941',
    ]);
  });
});
