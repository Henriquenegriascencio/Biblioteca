// Verifica se o usuário já está logado ao abrir a página
async function checarSessaoExistente() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        redirecionarPorTipo(session.user.id);
    }
}
checarSessaoExistente();

// Função centralizadora de redirecionamento
async function redirecionarPorTipo(userId) {
    const { data: perfil, error } = await window.supabaseClient
        .from('perfis')
        .select('tipo_usuario')
        .eq('id', userId)
        .single();

    if (error || !perfil) {
        alert("Erro: Perfil não encontrado no banco de dados. Contate o administrador.");
        await window.supabaseClient.auth.signOut();
        return;
    }

    // Direcionamento baseado no cargo
    if (perfil.tipo_usuario === 'administrador' || perfil.tipo_usuario === 'bibliotecario') {
        window.location.href = 'bibliotecario.html';
    } else if (perfil.tipo_usuario === 'aluno') {
        window.location.href = 'aluno.html';
    } else {
        alert("Tipo de usuário desconhecido: " + perfil.tipo_usuario);
        await window.supabaseClient.auth.signOut();
    }
}

// Ação do botão de Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Erro ao entrar: " + error.message);
    } else {
        redirecionarPorTipo(data.user.id);
    }
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Erro ao entrar: " + error.message);
    } else {
        const { data: perfil } = await window.supabaseClient.from('perfis').select('tipo_usuario').eq('id', data.user.id).single();
        if (perfil.tipo_usuario === 'bibliotecario') window.location.href = 'bibliotecario.html';
        else window.location.href = 'aluno.html';
    }
});

// Registro
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-senha').value;
    const tipo = document.getElementById('reg-tipo').value;
    
    // Novos campos
    const turma = document.getElementById('reg-turma').value;
    const matricula = document.getElementById('reg-matricula').value;

    const { error } = await window.supabaseClient.auth.signUp({
        email, 
        password, 
        options: { 
            data: { 
                nome: nome, 
                tipo_usuario: tipo,
                turma: turma,
                matricula: matricula
            } 
        }
    });

    if (error) alert("Erro: " + error.message);
    else {
        alert("Conta criada! Faça login.");
        document.getElementById('form-registro').reset();
        alternarCamposAluno(); // Reseta os campos visuais
    }
});