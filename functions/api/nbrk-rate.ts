/**
 * Cloudflare Pages Function — same-origin proxy for the NBRK exchange-rate feed.
 *
 * src/lib/crewPay/nbrkRate.ts calls nationalbank.kz directly, which works from React Native (RN
 * doesn't enforce CORS) but not from a browser: that endpoint sends no
 * Access-Control-Allow-Origin header, so a direct fetch from the page gets blocked. This function
 * runs server-side (on Cloudflare's edge, not in the browser), where CORS doesn't apply at all —
 * it fetches the real feed and hands the XML back from the same origin the page is already on, so
 * the browser never needs the upstream host's permission.
 *
 * Deliberately a thin, unmodified pass-through: the response body is NBRK's own XML, untouched.
 * All the actual parsing (parseNbrkEurRate) stays in nbrkRate.ts, shared with the native app's
 * direct-fetch path — this function only solves the browser-specific transport problem.
 */
export async function onRequestGet({ request }: { request: Request }): Promise<Response> {
  const fdate = new URL(request.url).searchParams.get('fdate');
  if (!fdate || !/^\d{2}\.\d{2}\.\d{4}$/.test(fdate)) {
    return new Response('Missing or malformed fdate (expected DD.MM.YYYY)', { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://nationalbank.kz/rss/get_rates.cfm?fdate=${encodeURIComponent(fdate)}`);
  } catch {
    return new Response('Could not reach nationalbank.kz', { status: 502 });
  }

  const xml = await upstream.text();
  return new Response(xml, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
