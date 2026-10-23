// Função para redirecionar baseado no perfil
async function redirecionarPorTipo(userId) {
    // Tenta buscar o perfil
    const { data: perfil, error } = await window.supabaseClient
        .from('perfis')
        .select('tipo_usuario')
        .eq('id', userId)
        .single();

    if (error || !perfil) {
        // Se der erro, avisa na tela em vez de ficar em silêncio
        alert("Erro ao buscar perfil no banco: " + (error ? error.message : "Perfil não encontrado."));
        console.error(error);
        return;
    }

    // Mostra no console qual cargo foi lido do banco (Aperte F12 para ver)
    console.log("O banco diz que o cargo é:", perfil.tipo_usuario);

    const cargo = perfil.tipo_usuario;

    // Redirecionamento
    if (cargo === 'administrador' || cargo === 'bibliotecario') {
        window.location.href = 'bibliotecario.html';
    } else if (cargo === 'aluno') {
        window.location.href = 'aluno.html';
    } else {
        alert("Cargo desconhecido no banco de dados: " + cargo);
    }
}

// Botão de Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Erro ao entrar: " + error.message);
    } else {
        // Passa o ID do usuário logado para a função de cima
        await redirecionarPorTipo(data.user.id);
    }
});

// Verifica se o usuário já estava logado ao abrir a página
async function checarSessaoExistente() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        await redirecionarPorTipo(session.user.id);
    }
}
checarSessaoExistente();


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