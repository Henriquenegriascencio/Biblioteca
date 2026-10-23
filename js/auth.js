async function redirecionar(userId) {
    const { data: perfil, error } = await window.supabaseClient.from('perfis').select('tipo_usuario').eq('id', userId).single();
    
    if (error || !perfil) {
        alert("Perfil não encontrado no banco. Contate o administrador.");
        await window.supabaseClient.auth.signOut();
        return;
    }

    if (perfil.tipo_usuario === 'administrador' || perfil.tipo_usuario === 'bibliotecario') {
        window.location.href = 'bibliotecario.html';
    } else {
        window.location.href = 'aluno.html';
    }
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Erro ao entrar: " + error.message);
    } else {
        await redirecionar(data.user.id);
    }
});

window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) redirecionar(session.user.id);
});