// Configuração global do Supabase
const SUPABASE_URL = 'https://sysghgyhotgobvbvzjju.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_YoavoW5o3SuMdp-b5Apmhg_GpPEit0O';

// Cria o cliente e exporta para o escopo global (window)
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função global para fazer logout
window.fazerLogout = async function() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
};