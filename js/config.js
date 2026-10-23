const SUPABASE_URL = 'https://sysghgyhotgobvbvzjju.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_YoavoW5o3SuMdp-b5Apmhg_GpPEit0O';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (localStorage.getItem('tema') === 'dark') {
    document.body.classList.add('dark-mode');
}

window.alternarTema = function() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('tema', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    const check = document.getElementById('check-dark');
    if (check) check.checked = document.body.classList.contains('dark-mode');
};

window.fazerLogout = async function() {
    try {
        await window.supabaseClient.auth.signOut();
        window.location.replace('index.html'); // Força a saída
    } catch (error) {
        console.error(error);
        window.location.replace('index.html');
    }
};

window.abrirConfig = async function() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return;
    
    const check = document.getElementById('check-dark');
    if (check) check.checked = document.body.classList.contains('dark-mode');

    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (p) {
        document.getElementById('conf-nome').innerText = p.nome || 'Usuário';
        document.getElementById('conf-email').innerText = session.user.email;
        document.getElementById('conf-tipo').innerText = p.tipo_usuario ? p.tipo_usuario.toUpperCase() : 'ALUNO';
        
        if(document.getElementById('conf-turma')) document.getElementById('conf-turma').innerText = p.turma || '-';
        if(document.getElementById('conf-matricula')) document.getElementById('conf-matricula').innerText = p.matricula || '-';
    }
    document.getElementById('modal-config').classList.add('active');
};

window.fecharConfig = function() {
    document.getElementById('modal-config').classList.remove('active');
};