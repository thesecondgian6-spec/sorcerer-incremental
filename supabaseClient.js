// ============================================
// SUPABASE CLIENT
// ============================================
// 1. Go to your Supabase project > Settings > API
// 2. Copy "Project URL" and "anon public" key below
// 3. This file is loaded on every page before other scripts

const SUPABASE_URL = "https://cbtkbkfuwbnggnjodnce.supabase.co";       // e.g. https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidGtia2Z1d2JuZ2duam9kbmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDUzODMsImV4cCI6MjA5OTY4MTM4M30.rhWkT2ZqjEBvcrn8hEtNflB-arUmuZ9gWmLCPBoot5o";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
