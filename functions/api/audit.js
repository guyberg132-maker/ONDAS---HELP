// Admin-only view of the page-view log. Open /api/audit in the browser.
// Only e-mails listed in the ADMIN_EMAILS variable can see it.
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dev = ua => /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "אחר";
const fmt = ts => new Date(ts).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export async function onRequestGet({ request, env }) {
  const email = (request.headers.get("Cf-Access-Authenticated-User-Email") || "").toLowerCase();
  const admins = String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const H = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "x-robots-tag": "noindex" };
  if (!email || !admins.includes(email)) return new Response("<h1 dir=rtl>אין הרשאה</h1>", { status: 403, headers: H });
  if (!env.DB) return new Response("<h1 dir=rtl>מסד הנתונים DB לא מחובר</h1>", { status: 503, headers: H });

  const url = new URL(request.url);
  const days = Math.max(1, Math.min(180, parseInt(url.searchParams.get("days") || "7", 10) || 7));
  const who = (url.searchParams.get("email") || "").toLowerCase().trim();
  const since = Date.now() - days * 864e5;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS views (ts INTEGER, email TEXT, page TEXT, title TEXT, country TEXT, ua TEXT)").run();
  const where = who ? "WHERE ts >= ? AND email = ?" : "WHERE ts >= ?";
  const args = who ? [since, who] : [since];
  const rows = (await env.DB.prepare(`SELECT ts, email, page, title, country, ua FROM views ${where} ORDER BY ts DESC LIMIT 2000`).bind(...args).all()).results || [];

  if (url.searchParams.get("format") === "csv") {
    const csv = "\uFEFFתאריך,משתמש,עמוד,כותרת,מדינה,מכשיר\n" + rows.map(r => [fmt(r.ts), r.email, r.page, r.title, r.country, dev(r.ua)].map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="views-${days}d.csv"`, "cache-control": "no-store" } });
  }
  const users = {}; const pages = {};
  for (const r of rows) {
    users[r.email] = users[r.email] || { n: 0, last: 0 }; users[r.email].n++; users[r.email].last = Math.max(users[r.email].last, r.ts);
    pages[r.title || r.page] = (pages[r.title || r.page] || 0) + 1;
  }
  const uRows = Object.entries(users).sort((a, b) => b[1].last - a[1].last).map(([e, v]) => `<tr><td><a href="?days=${days}&email=${encodeURIComponent(e)}">${esc(e)}</a></td><td>${v.n}</td><td>${fmt(v.last)}</td></tr>`).join("");
  const pRows = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t, n]) => `<tr><td>${esc(t)}</td><td>${n}</td></tr>`).join("");
  const vRows = rows.slice(0, 500).map(r => `<tr><td>${fmt(r.ts)}</td><td>${esc(r.email)}</td><td>${esc(r.title || r.page)}</td><td>${esc(r.country)}</td><td>${dev(r.ua)}</td></tr>`).join("");
  const opt = [1, 7, 30, 90, 180].map(d => `<a class="${d === days ? "on" : ""}" href="?days=${d}${who ? "&email=" + encodeURIComponent(who) : ""}">${d === 1 ? "יום" : d + " ימים"}</a>`).join("");
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>יומן צפיות</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f3f4f6;color:#0a1729}header{background:#0a1729;color:#fff;padding:16px 20px;border-bottom:3px solid #c53d27}
main{max-width:1100px;margin:0 auto;padding:16px}h1{margin:0;font-size:1.3rem}h2{font-size:1.05rem;margin:22px 0 8px}
.bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.bar a{padding:6px 12px;border:1px solid #cfd5df;border-radius:6px;background:#fff;color:#0a1729;text-decoration:none;font-size:.9rem}.bar a.on{background:#c53d27;color:#fff;border-color:#c53d27}
.wrap{overflow-x:auto;background:#fff;border:1px solid #dde1e8;border-radius:8px}table{border-collapse:collapse;width:100%;font-size:.88rem}th,td{padding:8px 10px;border-bottom:1px solid #eceff4;text-align:right;white-space:nowrap}th{background:#0a1729;color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.muted{color:#586274;font-size:.85rem}</style></head><body>
<header><h1>יומן צפיות – Technical Help</h1><div class="muted" style="color:#c5ccd8">מוצג למנהלים בלבד · ${esc(email)}</div></header><main>
<div class="bar">${opt}${who ? `<a href="?days=${days}">כל המשתמשים ✕ ${esc(who)}</a>` : ""}<a href="?days=${days}${who ? "&email=" + encodeURIComponent(who) : ""}&format=csv">הורדה ל־Excel (CSV)</a></div>
<p class="muted">${rows.length} צפיות ב־${days === 1 ? "יום האחרון" : days + " הימים האחרונים"}. הנתונים נשמרים 180 יום.</p>
<div class="grid"><div><h2>משתמשים</h2><div class="wrap"><table><tr><th>משתמש</th><th>צפיות</th><th>כניסה אחרונה</th></tr>${uRows || "<tr><td colspan=3>אין נתונים</td></tr>"}</table></div></div>
<div><h2>העמודים הנצפים ביותר</h2><div class="wrap"><table><tr><th>עמוד</th><th>צפיות</th></tr>${pRows || "<tr><td colspan=2>אין נתונים</td></tr>"}</table></div></div></div>
<h2>כל הצפיות (500 האחרונות)</h2><div class="wrap"><table><tr><th>זמן</th><th>משתמש</th><th>עמוד</th><th>מדינה</th><th>מכשיר</th></tr>${vRows || "<tr><td colspan=5>אין נתונים</td></tr>"}</table></div>
</main></body></html>`;
  return new Response(html, { headers: H });
}
