// Returns the signed-in user's e-mail (set by Cloudflare Access) and whether they are an admin.
export async function onRequestGet({ request, env }) {
  const email = (request.headers.get("Cf-Access-Authenticated-User-Email") || "").toLowerCase();
  const admins = String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  return new Response(JSON.stringify({ email, admin: !!email && admins.includes(email) }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
