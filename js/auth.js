async function redirecionar(userId) {
    const { data: perfil } = await window.supabaseClient.from('perfis').select('tipo_usuario').eq('id', userId).single();
    
    if (!perfil) return window.location.href = 'index.html';

    if (perfil.tipo_usuario === 'administrador') {
        window.location.href = 'admin.html'; // Nova página do Admin
    } else if (perfil.tipo_usuario === 'bibliotecario') {
        window.location.href = 'bibliotecario.html'; // Página do Bibliotecário
    } else {
        window.location.href = 'aluno.html';
    }
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) alert("Erro: " + error.message);
    else await redirecionar(data.user.id);
});