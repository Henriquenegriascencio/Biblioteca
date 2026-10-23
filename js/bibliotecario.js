let tipoUsuario = 'aluno';

async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: perfil } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    
    if (!perfil || perfil.tipo_usuario === 'aluno') return window.location.href = 'aluno.html';

    tipoUsuario = perfil.tipo_usuario;
    document.getElementById('user-nome').innerText = perfil.nome;
    document.getElementById('user-tipo').innerText = tipoUsuario === 'administrador' ? 'Administrador' : 'Bibliotecário';

    if (tipoUsuario === 'administrador') {
        document.getElementById('opt-bibliotecario').style.display = 'block';
        document.getElementById('titulo-painel').innerText = '👑 Painel do Administrador';
    } else {
        document.getElementById('titulo-painel').innerText = '📚 Painel do Bibliotecário';
    }

    carregarLivros();
    carregarAlunos();
    carregarEmprestimos();
    carregarRelatorios();
}
init();

function mudarAba(aba, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(event) event.target.classList.add('active');
}

// --- LIVROS ---
async function carregarLivros() {
    const { data: livros } = await window.supabaseClient.from('livros').select('*').order('id', { ascending: false });
    const tbody = document.querySelector('#tabela-livros tbody');
    const select = document.getElementById('select-livro');
    tbody.innerHTML = ''; select.innerHTML = '<option value="">Selecione um livro...</option>';
    document.getElementById('total-livros').innerText = livros.length;

    livros.forEach(l => {
        tbody.innerHTML += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td><td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
        if (l.disponivel) select.innerHTML += `<option value="${l.id}">${l.titulo}</option>`;
    });
}

document.getElementById('form-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.supabaseClient.from('livros').insert([{ 
        titulo: document.getElementById('titulo').value, 
        autor: document.getElementById('autor').value, 
        categoria: document.getElementById('categoria').value 
    }]);
    document.getElementById('form-livro').reset();
    carregarLivros();
});

// --- USUÁRIOS ---
async function carregarAlunos() {
    const { data: alunos } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno').order('nome');
    const select = document.getElementById('select-aluno');
    select.innerHTML = '<option value="">Selecione o Aluno...</option>';
    (alunos || []).forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.nome} ${a.turma ? '- ' + a.turma : ''}</option>`;
    });
}

function alternarCamposUsuario() {
    const isAluno = document.getElementById('user-tipo').value === 'aluno';
    document.getElementById('campos-aluno-user').style.display = isAluno ? 'block' : 'none';
}

document.getElementById('form-usuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Pega os elementos
    const elNome = document.getElementById('user-nome');
    const elEmail = document.getElementById('user-email');
    const elSenha = document.getElementById('user-senha');
    const elTipo = document.getElementById('user-tipo');
    
    // LOG DE TESTE NO CONSOLE (F12)
    console.log("Valor lido no campo nome:", elNome ? elNome.value : "Elemento não encontrado");

    // 2. Verifica se os elementos existem
    if (!elNome || !elEmail || !elSenha || !elTipo) {
        return alert("Erro interno: O formulário está com os IDs errados no HTML.");
    }

    // 3. Pega os valores limpando os espaços em branco
    const nome = elNome.value.trim();
    const email = elEmail.value.trim();
    const senha = elSenha.value;
    const tipoConta = elTipo.value;

    // Pega turma e matrícula apenas se os campos existirem
    const elTurma = document.getElementById('user-turma');
    const elMatricula = document.getElementById('user-matricula');
    const turma = elTurma ? elTurma.value.trim() : '';
    const matricula = elMatricula ? elMatricula.value.trim() : '';

    // 4. Verifica se o nome está realmente vazio
    if (nome === '') {
        return alert("Por favor, digite o nome do usuário.");
    }
    if (email === '') {
        return alert("Por favor, digite o e-mail.");
    }
    if (senha.length < 6) {
        return alert("A senha precisa ter pelo menos 6 caracteres.");
    }

    const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 5. Cria o login no Supabase Auth
    const { data, error } = await tempClient.auth.signUp({ 
        email: email, 
        password: senha, 
        options: { 
            data: { 
                nome: nome, 
                tipo_usuario: tipoConta, 
                turma: turma, 
                matricula: matricula 
            } 
        } 
    });

    if (error) {
        console.error("Erro no Auth:", error);
        return alert("Erro ao criar login: " + error.message);
    }

    // 6. Salva os dados na tabela perfis
    if (data && data.user) {
        console.log("Usuário criado no Auth. Salvando perfil...");
        
        const { error: erroUpsert } = await window.supabaseClient.from('perfis').upsert([{ 
            id: data.user.id, 
            nome: nome, 
            tipo_usuario: tipoConta, 
            turma: turma,
            matricula: matricula
        }]);

        if (erroUpsert) {
            console.error("Erro ao salvar perfil:", erroUpsert);
            return alert("Login criado, mas erro ao salvar os dados na tabela: " + erroUpsert.message);
        }

        alert(`Conta de ${nome} criada com sucesso!`);
        document.getElementById('form-usuario').reset();
        if (typeof alternarCamposUsuario === 'function') alternarCamposUsuario();
        if (typeof carregarAlunos === 'function') carregarAlunos();
    } else {
        alert("Erro: O Supabase não retornou o usuário. Verifique se o e-mail já está em uso.");
    }
});

// --- EMPRÉSTIMOS ---
async function carregarEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).eq('devolvido', false);
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    document.getElementById('total-emprestados').innerText = data ? data.length : 0;
    
    let atrasados = 0;
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    (data || []).forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        let isAtraso = dDev < hoje;
        if (isAtraso) atrasados++;

        let btn = `<button class="btn-devolver" onclick="devolver(${e.id}, ${e.livro_id})">Devolver</button>`;
        
        tbody.innerHTML += `
            <tr class="${isAtraso ? 'linha-atraso' : ''}">
                <td>${e.livros?.titulo || 'Excluído'}</td>
                <td>${e.perfis?.nome || e.nome_aluno || 'Desconhecido'}</td>
                <td>${dDev.toLocaleDateString('pt-BR')}</td>
                <td><span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span></td>
                <td>${btn}</td>
            </tr>
        `;
    });
    document.getElementById('total-atrasados').innerText = atrasados;
}

document.getElementById('form-emprestimo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const livro_id = document.getElementById('select-livro').value;
    const aluno_id = document.getElementById('select-aluno').value;
    const data_devolucao = document.getElementById('data-devolucao').value;
    if(!livro_id || !aluno_id) return alert("Preencha tudo!");

    await window.supabaseClient.from('emprestimos').insert([{ livro_id, aluno_id, data_devolucao }]);
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livro_id);
    
    document.getElementById('form-emprestimo').reset();
    carregarEmprestimos(); carregarLivros();
});

async function devolver(empId, livroId) {
    const hoje = new Date().toISOString().split('T')[0];
    await window.supabaseClient.from('emprestimos').update({ devolvido: true, data_devolucao_real: hoje }).eq('id', empId);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    carregarEmprestimos(); carregarLivros(); carregarRelatorios();
}

// --- RELATÓRIOS ---
async function carregarRelatorios() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).order('id', { ascending: false });
    const tbody = document.querySelector('#tabela-relatorios tbody');
    tbody.innerHTML = '';
    (data || []).forEach(e => {
        tbody.innerHTML += `
            <tr>
                <td>${e.livros?.titulo || 'Excluído'}</td>
                <td>${e.perfis?.nome || e.nome_aluno || 'Desconhecido'}</td>
                <td>${new Date(e.criado_em).toLocaleDateString('pt-BR')}</td>
                <td>${new Date(e.data_devolucao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${e.data_devolucao_real ? new Date(e.data_devolucao_real + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td><span class="${e.devolvido ? 'status-disponivel' : 'status-emprestado'}">${e.devolvido ? 'Devolvido' : 'Ativo'}</span></td>
            </tr>
        `;
    });
}