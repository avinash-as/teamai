// Server-side Supabase client using service role key (never expose to frontend)
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function getUserFromRequest(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  return sb.auth.getUser(token).then(({ data, error }) => {
    if (error || !data?.user) return null;
    return data.user;
  });
}