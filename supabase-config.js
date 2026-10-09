// ================================================
// Tomo.com — Supabase Configuration
// ================================================

const SUPABASE_URL = 'https://pejzxqmiczdgafwrjqdj.supabase.co';
const SUPABASE_KEY = 

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlanp4cW1pY3pkZ2Fmd3JqcWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzUzMTEsImV4cCI6MjEwNjk1MTMxMX0.LwOhEhIZ7Cj_2jaSLgOt0h5IW42poLyjzuWuVcE-VzQ
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🎬 Tomo.com: Supabase client initialized');
console.log('🌐 Project:', SUPABASE_URL);
