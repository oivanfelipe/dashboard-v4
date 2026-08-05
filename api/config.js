// /api/config.js — Vercel Serverless Function
// Returns public Supabase credentials to the frontend.
// The publishable key is safe to expose (RLS enforces security).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY });
}
