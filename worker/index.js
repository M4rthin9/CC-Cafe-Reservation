export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/turnstile-verify') {
      if (request.method !== 'POST') {
        return json({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405);
      }
      return handleTurnstileVerify(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleTurnstileVerify(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token || token.length > 2048) {
      return json({ success: false, error: 'INVALID_TOKEN' }, 400);
    }

    const expectedHostnames = new Set(
      String(env.TURNSTILE_HOSTNAMES || 'cida.dpdns.org')
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean),
    );

    const params = new URLSearchParams();
    params.set('secret', env.TURNSTILE_SECRET);
    params.set('response', token);
    const remoteip = request.headers.get('CF-Connecting-IP') || '';
    if (remoteip) params.set('remoteip', remoteip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const result = await res.json();

    const ok =
      result.success === true &&
      result.action === 'booking' &&
      expectedHostnames.has(result.hostname);

    if (ok) {
      return json({ success: true });
    }
    return json({ success: false, error: (result['error-codes'] || ['VERIFY_FAILED']).join(',') }, 403);
  } catch (e) {
    return json({ success: false, error: 'INTERNAL_ERROR' }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
