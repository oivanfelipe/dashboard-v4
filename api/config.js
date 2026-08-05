// /api/config.js — Vercel Serverless Function (CommonJS)
// Returns public Supabase credentials to the frontend.
// The publishable key is safe to expose (RLS enforces security).

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
  });
};
