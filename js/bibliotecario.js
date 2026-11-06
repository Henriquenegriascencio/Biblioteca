let tipoUsuario = 'bibliotecario';
let dadosLivros = [];
let dadosEmprestimos = [];
let dadosUsuarios = [];
let dadosRelatorios = [];

async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (!p || p.tipo_usuario !== 'bibliotecario') return window.location.href = 'index.html';

    document.getElementById('user-nome').innerText = p.nome;
    
    // Carrega todas as abas, incluindo a nova
    carregarLivros(); 
    carregarAlunosSelect(); 
    carregarUsuarios(); 
    carregarSolicitacoes(); // <--- AQUI ESTÁ A CHAMADA
    carregarEmprestimos(); 
    carregarRelatorios();
}
init();

function mudarAba(aba, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(event) event.target.closest('.nav-link').classList.add('active'); 
}

// ==========================================
// 1. SOLICITAÇÕES PENDENTES (A NOVA ABA)
// ==========================================
async function carregarSolicitacoes() {
    const { data } = await window.supabaseClient.from('emprestimos')
        .select(`*, livros(titulo), perfis(nome)`)
        .eq('status', 'pendente');
    
    const tbody = document.querySelector('#tabela-solicitacoes tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 20px;">Nenhuma solicitação pendente no momento.</td></tr>`;
        return;
    }

    data.forEach(e => {
        tbody.innerHTML += `
            <tr style="background: rgba(245, 158, 11, 0.05);">
                <td><strong>${e.livros?.titulo || 'Excluído'}</strong></td>
                <td>${e.perfis?.nome || e.nome_aluno || '?'}</td>
                <td>${new Date(e.criado_em).toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn-devolver btn-action" style="background:#10B981;" onclick="aprovarEmprestimo(${e.id}, ${e.livro_id})">✅ Aprovar</button>
                    <button class="btn-action" style="background:#EF4444; padding: 6px 10px; font-size:12px;" onclick="recusarEmprestimo(${e.id}, ${e.livro_id})">❌ Recusar</button>
                </td>
            </tr>
        `;
    });
}

async function aprovarEmprestimo(empId, livroId) {
    // 1. Calcula a data exata de 7 dias a partir de hoje
    let dataDev = new Date();
    dataDev.setDate(dataDev.getDate() + 7);
    const dataFormatada = dataDev.toISOString().split('T')[0];

    // 2. Atualiza o banco com o status "ativo" e a data calculada
    const { error } = await window.supabaseClient.from('emprestimos')
        .update({ status: 'ativo', data_devolucao: dataFormatada })
        .eq('id', empId);
    
    if (error) {
        alert("Erro ao aprovar: " + error.message);
        return;
    }

    alert("Empréstimo aprovado por 7 dias! O aluno já pode retirar o livro.");
    
    // 3. Atualiza todas as telas para refletir a mudança na hora
    carregarSolicitacoes();
    carregarEmprestimos();
    carregarRelatorios(); // <--- ESSA LINHA É A MÁGICA QUE FALTAVA
}

async function recusarEmprestimo(empId, livroId) {
    if(!confirm("Recusar esta solicitação? O livro voltará a ficar disponível na estante.")) return;
    
    await window.supabaseClient.from('emprestimos').update({ status: 'recusado' }).eq('id', empId);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    
    alert("Solicitação recusada e livro liberado.");
    carregarSolicitacoes();
    carregarLivros();
    carregarRelatorios(); // <--- ATUALIZA O RELATÓRIO AQUI TAMBÉM
}

// ==========================================
// 2. LIVROS
// ==========================================
async function carregarLivros() {
    const { data } = await window.supabaseClient.from('livros').select('*').order('id', { ascending: false });
    dadosLivros = data || [];
    const select = document.getElementById('select-livro');
    if (select) {
        select.innerHTML = '<option value="">Selecione um livro...</option>';
        dadosLivros.filter(l => l.disponivel).forEach(l => select.innerHTML += `<option value="${l.id}">${l.titulo}</option>`);
    }
    renderizarLivros(dadosLivros);
}

function renderizarLivros(lista) {
    const tbody = document.querySelector('#tabela-livros tbody');
    tbody.innerHTML = '';
    document.getElementById('total-livros').innerText = dadosLivros.length;
    if (lista.length === 0) return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhum livro.</td></tr>`;
    lista.forEach(l => {
        tbody.innerHTML += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td><td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
    });
}

document.getElementById('form-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.supabaseClient.from('livros').insert([{ titulo: document.getElementById('titulo').value, autor: document.getElementById('autor').value, categoria: document.getElementById('categoria').value }]);
    document.getElementById('form-livro').reset(); carregarLivros(); alert("Livro cadastrado!");
});

// ==========================================
// 3. EMPRÉSTIMOS ATIVOS
// ==========================================
async function carregarEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos')
        .select(`*, livros(titulo), perfis(nome)`)
        .eq('status', 'ativo');
    dadosEmprestimos = data || [];
    renderizarEmprestimos(dadosEmprestimos);
}

function renderizarEmprestimos(lista) {
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = ''; 
    document.getElementById('total-emprestados').innerText = dadosEmprestimos.length;
    
    let atrasados = 0; const hoje = new Date(); hoje.setHours(0,0,0,0);
    dadosEmprestimos.forEach(e => { if(new Date(e.data_devolucao + 'T00:00:00') < hoje) atrasados++; });
    document.getElementById('total-atrasados').innerText = atrasados;

    if (lista.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum empréstimo ativo.</td></tr>`;

    lista.forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        let isAtraso = dDev < hoje;
        tbody.innerHTML += `
            <tr class="${isAtraso ? 'linha-atraso' : ''}">
                <td>${e.livros?.titulo || 'Excluído'}</td><td>${e.perfis?.nome || e.nome_aluno || '?'}</td>
                <td>${dDev.toLocaleDateString('pt-BR')}</td>
                <td><span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span></td>
                <td><button class="btn-devolver btn-action" style="background:#17a2b8;" onclick="devolver(${e.id}, ${e.livro_id})">Devolver</button></td>
            </tr>`;
    });
}

document.getElementById('form-emprestimo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const livro_id = document.getElementById('select-livro').value;
    const aluno_id = document.getElementById('select-aluno').value;
    const data_devolucao = document.getElementById('data-devolucao').value;
    if(!livro_id || !aluno_id) return alert("Preencha tudo!");
    
    // Cria direto como ativo (Registro manual)
    await window.supabaseClient.from('emprestimos').insert([{ livro_id, aluno_id, data_devolucao, status: 'ativo' }]);
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livro_id);
    document.getElementById('form-emprestimo').reset(); 
    carregarEmprestimos(); carregarLivros();
});

async function devolver(empId, livroId) {
    const hoje = new Date().toISOString().split('T')[0];
    await window.supabaseClient.from('emprestimos').update({ status: 'devolvido', devolvido: true, data_devolucao_real: hoje }).eq('id', empId);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    carregarEmprestimos(); carregarLivros(); carregarRelatorios();
}

// ==========================================
// 4. RELATÓRIOS (Com o conserto da Data Inválida)
// ==========================================
async function carregarRelatorios() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).order('id', { ascending: false });
    dadosRelatorios = data || [];
    renderizarRelatorios(dadosRelatorios);
}

function renderizarRelatorios(lista) {
    const tbody = document.querySelector('#tabela-relatorios tbody');
    tbody.innerHTML = '';
    if (lista.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum registro.</td></tr>`;
    
    lista.forEach(e => {
        let statusHtml = '';
        // Formata a data, se ela existir (evita o erro "Invalid Date")
        let dataPrevista = e.data_devolucao ? new Date(e.data_devolucao + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        
        // Define o texto e a cor do status baseado no banco de dados
        if (e.status === 'pendente') {
            statusHtml = `<span class="status-emprestado">Pendente</span>`;
        } else if (e.status === 'recusado') {
            statusHtml = `<span class="status-atraso" style="background:#374151; color:white;">Recusado</span>`;
        } else if (e.status === 'ativo') {
            statusHtml = `<span class="status-emprestado">Emprestado</span>`; // <-- MUDANÇA AQUI
        } else {
            statusHtml = `<span class="status-disponivel">Devolvido</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${e.livros?.titulo || 'Excluído'}</td>
                <td>${e.perfis?.nome || e.nome_aluno || '?'}</td>
                <td>${new Date(e.criado_em).toLocaleDateString('pt-BR')}</td>
                <td>${dataPrevista}</td>
                <td>${e.data_devolucao_real ? new Date(e.data_devolucao_real + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td>${statusHtml}</td>
            </tr>`;
    });
}

// ==========================================
// 5. FILTROS E USUÁRIOS
// ==========================================
async function carregarAlunosSelect() {
    const { data } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno').order('nome');
    const select = document.getElementById('select-aluno');
    if (select) {
        select.innerHTML = '<option value="">Selecione o Aluno...</option>';
        (data || []).forEach(a => select.innerHTML += `<option value="${a.id}">${a.nome} ${a.turma ? '- ' + a.turma : ''}</option>`);
    }
}

async function carregarUsuarios() {
    const { data } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno').order('nome');
    dadosUsuarios = data || [];
    renderizarUsuarios(dadosUsuarios);
}

function renderizarUsuarios(lista) {
    const tbody = document.querySelector('#tabela-usuarios tbody');
    tbody.innerHTML = '';
    if (lista.length === 0) return tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhum aluno.</td></tr>`;
    lista.forEach(u => tbody.innerHTML += `<tr><td>${u.nome}</td><td>${u.turma || '-'}</td><td>${u.matricula || '-'}</td></tr>`);
}

document.getElementById('form-usuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const nome = (formData.get('nome') || '').trim();
    const email = (formData.get('email') || '').trim();
    const senha = formData.get('senha') || '';
    const turma = (formData.get('turma') || '').trim();
    const matricula = (formData.get('matricula') || '').trim();

    if (senha.length < 6) return alert("Senha muito curta.");

    const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await tempClient.auth.signUp({ email, password: senha, options: { data: { nome, tipo_usuario: 'aluno', turma, matricula } } });
    if (error) return alert("Erro: " + error.message);

    if (data.user) {
        await window.supabaseClient.from('perfis').upsert([{ id: data.user.id, nome, tipo_usuario: 'aluno', turma, matricula }]);
        document.getElementById('form-usuario').reset(); carregarUsuarios(); carregarAlunosSelect();
    }
});

// (As funções de filtro filtrarLivros, filtrarUsuarios, etc..., devem continuar aqui abaixo)