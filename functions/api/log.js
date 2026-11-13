// Records one page view: who (Cloudflare Access e-mail), what page, when, from which country/device.
// Needs a D1 database binding named "DB". Without it, this endpoint does nothing.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return new Response(null, { status: 204 });
  try {
    const email = (request.headers.get("Cf-Access-Authenticated-User-Email") || "unknown").toLowerCase();
    let b = {};
    try { b = await request.json(); } catch (e) {}
    const page = String(b.p || "").slice(0, 120);
    const title = String(b.t || "").slice(0, 200);
    const cf = request.cf || {};
    const ua = String(request.headers.get("user-agent") || "").slice(0, 200);
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS views (ts INTEGER, email TEXT, page TEXT, title TEXT, country TEXT, ua TEXT)").run();
    await env.DB.prepare("INSERT INTO views (ts, email, page, title, country, ua) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(Date.now(), email, page, title, cf.country || "", ua).run();
    if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM views WHERE ts < ?").bind(Date.now() - 180 * 864e5).run();
  } catch (e) {}
  return new Response(null, { status: 204 });
}
