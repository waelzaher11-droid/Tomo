// ============================================
// Tomo.com — Supabase Configuration
// ============================================

const SUPABASE_URL = 'https://pejzxqmiczdgafwrjqdj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UXDdY-lbfX03XEDjpg3L_A_hslai_iw';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🎬 Tomo.com: Supabase client initialized');
console.log('📡 Project:', SUPABASE_URL);
