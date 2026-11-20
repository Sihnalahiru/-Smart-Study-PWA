interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_RESET_PASSWORD?: string;
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/admin/verify-reset') {
      if (request.method !== 'POST') {
        return json({error: 'Method not allowed'}, 405);
      }
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) {
        return json({error: 'Forbidden'}, 403);
      }
      if (!env.ADMIN_RESET_PASSWORD) {
        return json({error: 'Admin reset is not configured'}, 503);
      }
      let credentials: {username?: string; password?: string};
      try {
        const raw = await request.text();
        if (raw.length > 2048) return json({error: 'Invalid request'}, 400);
        credentials = JSON.parse(raw) as {username?: string; password?: string};
      } catch {
        return json({error: 'Invalid request'}, 400);
      }
      const validUser = constantTimeEqual(credentials.username ?? '', 'Admin');
      const validPassword = constantTimeEqual(
        credentials.password ?? '',
        env.ADMIN_RESET_PASSWORD,
      );
      if (!validUser || !validPassword) {
        return json({error: 'Invalid administrator credentials'}, 401);
      }
      return json({verified: true});
    }
    return env.ASSETS.fetch(request);
  },
};
