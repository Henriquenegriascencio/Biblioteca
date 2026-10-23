const SUPABASE_URL = 'https://sysghgyhotgobvbvzjju.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_YoavoW5o3SuMdp-b5Apmhg_GpPEit0O';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.fazerLogout = async function() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
};