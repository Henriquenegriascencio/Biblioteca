const SUPABASE_URL = 'https://sysghgyhotgobvbvzjju.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_YoavoW5o3SuMdp-b5Apmhg_GpPEit0O';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Verifica o tema ao carregar a página
if (localStorage.getItem('tema') === 'dark') {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
}

// Função de trocar tema
window.alternarTema = function() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('tema', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    const check = document.getElementById('check-dark');
    if (check) check.checked = document.body.classList.contains('dark-mode');
};

// Função de Sair
window.fazerLogout = async function() {
    try {
        await window.supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error(error);
        window.location.href = 'index.html';
    }
};

// Função de Abrir Configurações
window.abrirConfig = async function() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return;
    
    const check = document.getElementById('check-dark');
    if (check) check.checked = document.body.classList.contains('dark-mode');

    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (p) {
        const elNome = document.getElementById('conf-nome');
        const elEmail = document.getElementById('conf-email');
        const elTipo = document.getElementById('conf-tipo');
        
        if (elNome) elNome.innerText = p.nome || 'Usuário';
        if (elEmail) elEmail.innerText = session.user.email;
        if (elTipo) elTipo.innerText = p.tipo_usuario ? p.tipo_usuario.toUpperCase() : 'ALUNO';
        
        const elTurma = document.getElementById('conf-turma');
        const elMatricula = document.getElementById('conf-matricula');
        if (elTurma) elTurma.innerText = p.turma || '-';
        if (elMatricula) elMatricula.innerText = p.matricula || '-';
    }
    
    const modal = document.getElementById('modal-config');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error("ERRO: A div id='modal-config' não existe no HTML.");
    }
};

window.fecharConfig = function() {
    const modal = document.getElementById('modal-config');
    if (modal) modal.classList.remove('active');
};