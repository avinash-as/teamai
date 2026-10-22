import { getSupabaseAdmin, getUserFromRequest } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: "Supabase not configured" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data, error } = await sb.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ projects: data });
  }

  if (req.method === "POST") {
    const p = req.body || {};
    const { data, error } = await sb.from("projects").upsert({
      id: p.id || Date.now().toString(),
      user_id: user.id,
      team_id: p.teamId || p.team_id,
      team_name: p.teamName || p.team_name,
      team_emoji: p.teamEmoji || p.team_emoji,
      title: p.title,
      idea: p.idea,
      results: p.results,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ project: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await sb.from("projects").delete().eq("id", id).eq("user_id", user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}