import { http, HttpResponse } from 'msw';
import { appConfig } from '@/lib/config';
import { capabilitiesFixture } from '../fixtures/capabilities';

const base = appConfig.BACKEND_URL_CENTRAL;

export const capabilitiesHandlers = [
  http.get(`${base}/capabilities`, ({ request }) => {
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang');
    // Mock simple: si se pide otro idioma, devolvemos el mismo fixture
    // (en un escenario real el central retornaría strings traducidos).
    const caps = lang ? { ...capabilitiesFixture, _requested_lang: lang } : capabilitiesFixture;
    return HttpResponse.json(caps, {
      headers: {
        'X-Capabilities-Version': capabilitiesFixture.hash ?? capabilitiesFixture.version,
      },
    });
  }),
];
