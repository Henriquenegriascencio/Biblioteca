const SUPABASE_URL = 'https://sysghgyhotgobvbvzjju.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_YoavoW5o3SuMdp-b5Apmhg_GpPEit0O';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.fazerLogout = async function() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
};

// Verifica se o usuário já escolheu o modo escuro antes
if (localStorage.getItem('tema') === 'dark') {
    document.body.classList.add('dark-mode');
}

// Função global para alternar o tema
window.alternarTema = function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
    
    // Atualiza o checkbox do modal, se ele existir na tela
    const checkbox = document.getElementById('check-dark');
    if (checkbox) checkbox.checked = isDark;
};