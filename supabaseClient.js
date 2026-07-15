// ============================================
// SUPABASE CLIENT
// ============================================
// 1. Go to your Supabase project > Settings > API
// 2. Copy "Project URL" and "anon public" key below
// 3. This file is loaded on every page before other scripts

const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";       // e.g. https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
