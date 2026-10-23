// Variáveis globais
let tipoUsuario = 'aluno';

// ==========================================
// 1. INICIALIZAÇÃO E PROTEÇÃO DE ROTA
// ==========================================
async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: perfil } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    
    if (!perfil || perfil.tipo_usuario === 'aluno') return window.location.href = 'aluno.html';

    tipoUsuario = perfil.tipo_usuario;
    document.getElementById('user-nome').innerText = perfil.nome || 'Usuário';
    document.getElementById('user-tipo').innerText = tipoUsuario === 'administrador' ? 'Administrador' : 'Bibliotecário';

    if (tipoUsuario === 'administrador') {
        const optBib = document.getElementById('opt-bibliotecario');
        if (optBib) optBib.style.display = 'block';
        const titulo = document.getElementById('titulo-painel');
        if (titulo) titulo.innerText = '👑 Painel do Administrador';
    } else {
        const titulo = document.getElementById('titulo-painel');
        if (titulo) titulo.innerText = '📚 Painel do Bibliotecário';
    }

    carregarLivros();
    carregarAlunos();
    carregarEmprestimos();
    carregarRelatorios();
}
init();

// ==========================================
// 2. CONTROLE DE ABAS
// ==========================================
function mudarAba(aba, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const abaAlvo = document.getElementById(`aba-${aba}`);
    if (abaAlvo) abaAlvo.classList.add('active');
    
    if (event && event.target) event.target.classList.add('active');
}

// ==========================================
// 3. LIVROS
// ==========================================
async function carregarLivros() {
    const { data: livros } = await window.supabaseClient.from('livros').select('*').order('id', { ascending: false });
    const tbody = document.querySelector('#tabela-livros tbody');
    const select = document.getElementById('select-livro');
    
    if (tbody) tbody.innerHTML = ''; 
    if (select) select.innerHTML = '<option value="">Selecione um livro...</option>';
    
    const totalEl = document.getElementById('total-livros');
    if (totalEl) totalEl.innerText = livros ? livros.length : 0;

    (livros || []).forEach(l => {
        if (tbody) {
            tbody.innerHTML += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td><td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
        }
        if (l.disponivel && select) {
            select.innerHTML += `<option value="${l.id}">${l.titulo}</option>`;
        }
    });
}

document.getElementById('form-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('titulo')?.value || '';
    const autor = document.getElementById('autor')?.value || '';
    const categoria = document.getElementById('categoria')?.value || 'Geral';

    if (!titulo || !autor) return alert("Preencha título e autor.");

    const { error } = await window.supabaseClient.from('livros').insert([{ titulo, autor, categoria }]);
    if (error) return alert("Erro ao cadastrar livro: " + error.message);

    document.getElementById('form-livro').reset();
    carregarLivros();
    alert("Livro cadastrado!");
});

// ==========================================
// 4. USUÁRIOS (AQUI ESTAVA O ERRO)
// ==========================================
async function carregarAlunos() {
    const { data: alunos } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno').order('nome');
    const select = document.getElementById('select-aluno');
    
    if (!select) return;

    select.innerHTML = '<option value="">Selecione o Aluno...</option>';
    (alunos || []).forEach(a => {
        const nomeSeguro = a.nome || 'Aluno sem nome';
        const turmaTexto = a.turma ? ` - ${a.turma}` : '';
        select.innerHTML += `<option value="${a.id}">${nomeSeguro}${turmaTexto}</option>`;
    });
}

function alternarCamposUsuario() {
    const selectTipo = document.getElementById('user-tipo');
    if (!selectTipo) return;

    const isAluno = selectTipo.value === 'aluno';
    const campos = document.getElementById('campos-aluno-user');
    if (campos) campos.style.display = isAluno ? 'block' : 'none';
}

document.getElementById('form-usuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // A MÁGICA ACONTECE AQUI: O FormData lê os inputs pelo atributo "name"
    const formData = new FormData(e.target);
    
    // Pega os valores com segurança (se não achar, retorna null, então usamos || '')
    const nome = (formData.get('nome') || '').trim();
    const email = (formData.get('email') || '').trim();
    const senha = formData.get('senha') || '';
    const tipoConta = formData.get('tipo') || 'aluno';
    const turma = (formData.get('turma') || '').trim();
    const matricula = (formData.get('matricula') || '').trim();

    // Validações
    if (nome === '') return alert("Por favor, digite o nome do usuário.");
    if (email === '') return alert("Por favor, digite o e-mail.");
    if (senha.length < 6) return alert("A senha precisa ter pelo menos 6 caracteres.");

    const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Cria login
    const { data, error } = await tempClient.auth.signUp({ 
        email: email, 
        password: senha, 
        options: { data: { nome: nome, tipo_usuario: tipoConta, turma: turma, matricula: matricula } } 
    });

    if (error) return alert("Erro ao criar login: " + error.message);

    // Salva no banco
    if (data && data.user) {
        const { error: erroUpsert } = await window.supabaseClient.from('perfis').upsert([{ 
            id: data.user.id, 
            nome: nome, 
            tipo_usuario: tipoConta, 
            turma: turma,
            matricula: matricula
        }]);

        if (erroUpsert) return alert("Erro ao salvar dados: " + erroUpsert.message);

        alert(`Conta de ${nome} criada com sucesso!`);
        document.getElementById('form-usuario').reset();
        alternarCamposUsuario();
        carregarAlunos();
    } else {
        alert("Erro: E-mail já cadastrado ou inválido.");
    }
});

// ==========================================
// 5. EMPRÉSTIMOS
// ==========================================
async function carregarEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).eq('devolvido', false);
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    
    if (tbody) tbody.innerHTML = '';
    
    const totalEl = document.getElementById('total-emprestados');
    if (totalEl) totalEl.innerText = data ? data.length : 0;
    
    let atrasados = 0;
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    (data || []).forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        let isAtraso = dDev < hoje;
        if (isAtraso) atrasados++;

        let btn = `<button class="btn-devolver" onclick="devolver(${e.id}, ${e.livro_id})">Devolver</button>`;
        
        if (tbody) {
            tbody.innerHTML += `
                <tr class="${isAtraso ? 'linha-atraso' : ''}">
                    <td>${e.livros?.titulo || 'Excluído'}</td>
                    <td>${e.perfis?.nome || e.nome_aluno || 'Desconhecido'}</td>
                    <td>${dDev.toLocaleDateString('pt-BR')}</td>
                    <td><span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span></td>
                    <td>${btn}</td>
                </tr>
            `;
        }
    });
    
    const atrasadosEl = document.getElementById('total-atrasados');
    if (atrasadosEl) atrasadosEl.innerText = atrasados;
}

document.getElementById('form-emprestimo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const livro_id = document.getElementById('select-livro')?.value;
    const aluno_id = document.getElementById('select-aluno')?.value;
    const data_devolucao = document.getElementById('data-devolucao')?.value;

    if(!livro_id || !aluno_id || !data_devolucao) return alert("Preencha todos os campos!");

    await window.supabaseClient.from('emprestimos').insert([{ livro_id, aluno_id, data_devolucao }]);
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livro_id);
    
    document.getElementById('form-emprestimo').reset();
    carregarEmprestimos(); 
    carregarLivros();
});

async function devolver(empId, livroId) {
    const hoje = new Date().toISOString().split('T')[0];
    await window.supabaseClient.from('emprestimos').update({ devolvido: true, data_devolucao_real: hoje }).eq('id', empId);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    carregarEmprestimos(); carregarLivros(); carregarRelatorios();
}

// ==========================================
// 6. RELATÓRIOS
// ==========================================
async function carregarRelatorios() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).order('id', { ascending: false });
    const tbody = document.querySelector('#tabela-relatorios tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // ==========================================
    // AQUI ESTÁ A MÁGICA DO RELATÓRIO VAZIO
    // Se 'data' for nulo ou estiver vazio, mostra a mensagem e para a função.
    // ==========================================
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; color: var(--text-muted); padding: 20px;">
                    Nenhum empréstimo registrado no sistema até o momento.
                </td>
            </tr>
        `;
        return; // O 'return' impede que o código tente ler dados que não existem
    }

    // Se tiver dados, ele continua e desenha a tabela normal
    data.forEach(e => {
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

// --- CONTROLE DO MODAL DE CONFIGURAÇÕES ---
async function abrirConfig() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return;
    
    // Marca o checkbox se o modo escuro estiver ativo
    document.getElementById('check-dark').checked = document.body.classList.contains('dark-mode');

    // Busca os dados atualizados do perfil
    const { data: perfil } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    
    if (perfil) {
        document.getElementById('conf-nome').innerText = perfil.nome || 'Não informado';
        document.getElementById('conf-email').innerText = session.user.email;
        document.getElementById('conf-tipo').innerText = perfil.tipo_usuario.toUpperCase();
        document.getElementById('conf-turma').innerText = perfil.turma || '-';
        document.getElementById('conf-matricula').innerText = perfil.matricula || '-';
    }
    
    document.getElementById('modal-config').classList.add('active');
}

function fecharConfig() {
    document.getElementById('modal-config').classList.remove('active');
}