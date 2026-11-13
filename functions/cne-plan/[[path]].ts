interface CfContext {
  params: {
    path?: string[];
  };
}

const SEGMENT_RE = /^\d{1,6}$/;

/**
 * Proxy de Cloudflare Pages Function para /cne-plan/:proceso/:formulario/:plan.
 * Valida los 3 identificadores numéricos y cachea respuestas exitosas en el borde
 * para reducir la carga hacia backend-apps.cne.gob.ec.
 */
export async function onRequestGet(context: CfContext): Promise<Response> {
  const segments = context.params.path ?? [];
  if (segments.length !== 3 || !segments.every((seg) => SEGMENT_RE.test(seg))) {
    return new Response('Identificador de plan inválido.', { status: 400 });
  }

  const [proceso, formulario, plan] = segments;
  const upstreamUrl = `https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/${proceso}/${formulario}/${plan}`;

  const upstream = await fetch(upstreamUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/pdf,application/octet-stream,*/*',
    },
  });

  if (!upstream.ok) {
    return new Response('El CNE no entregó este plan.', { status: upstream.status });
  }

  const headers = new Headers(upstream.headers);
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

