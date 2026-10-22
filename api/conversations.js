import { getSupabaseAdmin, getUserFromRequest } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: "Supabase not configured", hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data, error } = await sb.from("conversations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ conversations: data });
  }

  if (req.method === "POST") {
    const { id, team_id, title, messages } = req.body || {};
    const { data, error } = await sb.from("conversations").upsert({
      id: id || Date.now().toString(),
      user_id: user.id,
      team_id,
      title: title || "New chat",
      messages: messages || [],
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ conversation: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await sb.from("conversations").delete().eq("id", id).eq("user_id", user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}