// Technical Help – assistant endpoint (Cloudflare Pages Function).
// Runs behind Cloudflare Access (same host), so only signed-in users can call it.
// Needs a Workers AI binding named "AI" in the Pages project settings.
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export async function onRequestPost({ request, env }) {
  try {
    if (!env.AI) return json({ error: "AI binding missing" }, 503);
    const body = await request.json();
    const question = String(body.question || "").slice(0, 1200).trim();
    const context = String(body.context || "").slice(0, 14000);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    if (!question) return json({ error: "empty question" }, 400);

    const system = [
      "You are a technical help assistant for unmanned ground vehicle systems (IRONWAVE: BISON UGV, control container, DTC communication).",
      "Answer ONLY from the CONTEXT below, which comes from the official site content.",
      "If the answer is not in the CONTEXT, say clearly that this information is not in the site, and do not guess.",
      "Answer in the same language as the question (Hebrew or English). Use clear, short numbered steps for procedures.",
      "Copy commands, IP addresses, part numbers, values and units exactly as written in the CONTEXT. Never invent values.",
      "Mention safety notes from the CONTEXT when relevant. Keep answers focused and practical for a field technician.",
      "", "CONTEXT:", context
    ].join("\n");

    const messages = [{ role: "system", content: system }];
    for (const m of history) {
      if (m && m.content) messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) });
    }
    messages.push({ role: "user", content: question });

    const out = await env.AI.run(MODEL, { messages, max_tokens: 900, temperature: 0.2 });
    const answer = (out && (out.response || out.result || "")) + "";
    if (!answer.trim()) return json({ error: "empty answer" }, 502);
    return json({ answer });
  } catch (e) {
    return json({ error: "assistant failed" }, 500);
  }
}

export async function onRequest() {
  return json({ error: "method not allowed" }, 405);
}
