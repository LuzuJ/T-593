const DEFAULT_PROXY_BASE = '/cne-plan';
const CNE_DIRECT_BASE = 'https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo';

export interface PlanUrlSource {
  proceso?: number | string;
  cod_formulario?: number | string;
  cod_plan?: number | string;
  url_plan?: string;
}

export function normalizeProxyBase(rawBase?: string): string {
  const trimmed = (rawBase || '').trim();
  if (!trimmed) return DEFAULT_PROXY_BASE;
  return trimmed.replace(/\/+$/, '') || DEFAULT_PROXY_BASE;
}

export function getProxyBase(): string {
  return normalizeProxyBase(import.meta.env.VITE_CNE_PLAN_PROXY_BASE);
}

export function isValidPlanId(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value < 1_000_000;
}

export function buildCnePlanProxyUrl(
  proceso: number,
  codFormulario: number,
  codPlan: number,
  proxyBase = getProxyBase()
): string | null {
  if (!isValidPlanId(proceso) || !isValidPlanId(codFormulario) || !isValidPlanId(codPlan)) {
    return null;
  }
  return `${normalizeProxyBase(proxyBase)}/${proceso}/${codFormulario}/${codPlan}`;
}

export function buildCnePlanDirectUrl(
  proceso: number,
  codFormulario: number,
  codPlan: number
): string | null {
  if (!isValidPlanId(proceso) || !isValidPlanId(codFormulario) || !isValidPlanId(codPlan)) {
    return null;
  }
  return `${CNE_DIRECT_BASE}/${proceso}/${codFormulario}/${codPlan}`;
}

export function getLocalPlanUrl(urlPlan?: string): string | null {
  if (!urlPlan) return null;
  return /^\/planes\/[A-Za-z0-9._ -]+\.pdf$/.test(urlPlan) ? urlPlan : null;
}

export function getPdfCandidateSources(
  fila: PlanUrlSource,
  proxyBase = getProxyBase()
): string[] {
  const proceso = Number(fila.proceso);
  const formulario = Number(fila.cod_formulario);
  const plan = Number(fila.cod_plan);

  const candidates = [
    buildCnePlanProxyUrl(proceso, formulario, plan, proxyBase),
    getLocalPlanUrl(fila.url_plan),
    fila.url_plan && /^https:\/\//i.test(fila.url_plan) ? fila.url_plan : null,
    buildCnePlanDirectUrl(proceso, formulario, plan),
  ].filter((url): url is string => Boolean(url));

  return [...new Set(candidates)];
}
