let tipoUsuario = 'administrador';
let dadosLivros = [];
let dadosEmprestimos = [];
let dadosUsuarios = [];
let dadosRelatorios = [];

// Função auxiliar para fechar modais
window.fecharModal = function(id) {
    document.getElementById(id).classList.remove('active');
};

// ==========================================
// 1. INICIALIZAÇÃO
// ==========================================
async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (!p || p.tipo_usuario !== 'administrador') return window.location.href = 'index.html';

    document.getElementById('user-nome').innerText = p.nome;
    
    carregarLivros(); carregarAlunosSelect(); carregarUsuarios(); carregarEmprestimos(); carregarRelatorios();
}
init();

function mudarAba(aba, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(event) event.target.classList.add('active');
}

// ==========================================
// 2. LIVROS (Ler, Criar, Editar, Excluir)
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

    if (lista.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum livro encontrado.</td></tr>`;
    
    lista.forEach(l => {
        tbody.innerHTML += `
            <tr>
                <td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td>
                <td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td>
                <td>
                    <button class="btn-action" style="background:#F59E0B; padding: 6px 10px; font-size:12px;" onclick="abrirEditLivro(${l.id})">✏️</button>
                    <button class="btn-action" style="background:#EF4444; padding: 6px 10px; font-size:12px;" onclick="excluirLivro(${l.id})">🗑️</button>
                </td>
            </tr>`;
    });
}

document.getElementById('form-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.supabaseClient.from('livros').insert([{ titulo: document.getElementById('titulo').value, autor: document.getElementById('autor').value, categoria: document.getElementById('categoria').value }]);
    document.getElementById('form-livro').reset(); 
    carregarLivros();
});

// Abrir e Salvar Edição de Livro
function abrirEditLivro(id) {
    const livro = dadosLivros.find(l => l.id === id);
    if (!livro) return;
    document.getElementById('edit-livro-id').value = livro.id;
    document.getElementById('edit-livro-titulo').value = livro.titulo;
    document.getElementById('edit-livro-autor').value = livro.autor;
    document.getElementById('edit-livro-categoria').value = livro.categoria || 'Geral';
    document.getElementById('modal-livro').classList.add('active');
}

document.getElementById('form-edit-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-livro-id').value;
    await window.supabaseClient.from('livros').update({
        titulo: document.getElementById('edit-livro-titulo').value,
        autor: document.getElementById('edit-livro-autor').value,
        categoria: document.getElementById('edit-livro-categoria').value
    }).eq('id', id);
    
    fecharModal('modal-livro');
    carregarLivros();
});

async function excluirLivro(id) {
    if(!confirm("Tem certeza que deseja APAGAR este livro do acervo permanentemente?")) return;
    await window.supabaseClient.from('livros').delete().eq('id', id);
    carregarLivros();
}

// ==========================================
// 3. USUÁRIOS (Editar, Excluir)
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
    const { data } = await window.supabaseClient.from('perfis').select('*').order('nome');
    dadosUsuarios = data || [];
    renderizarUsuarios(dadosUsuarios);
}

function renderizarUsuarios(lista) {
    const tbody = document.querySelector('#tabela-usuarios tbody');
    tbody.innerHTML = '';
    if (lista.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum usuário.</td></tr>`;
    
    lista.forEach(u => {
        const badge = u.tipo_usuario === 'administrador' ? '👑 Admin' : u.tipo_usuario === 'bibliotecario' ? '📚 Biblio' : '🎒 Aluno';
        tbody.innerHTML += `
            <tr>
                <td>${u.nome}</td><td><strong>${badge}</strong></td><td>${u.turma || '-'}</td><td>${u.matricula || '-'}</td>
                <td>
                    <button class="btn-action" style="background:#F59E0B; padding: 6px 10px; font-size:12px;" onclick="abrirEditUser('${u.id}')">✏️</button>
                    <button class="btn-action" style="background:#EF4444; padding: 6px 10px; font-size:12px;" onclick="excluirUser('${u.id}')">🗑️</button>
                </td>
            </tr>`;
    });
}

function abrirEditUser(id) {
    const user = dadosUsuarios.find(u => u.id === id);
    if (!user) return;
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-nome').value = user.nome;
    document.getElementById('edit-user-tipo').value = user.tipo_usuario;
    document.getElementById('edit-user-turma').value = user.turma || '';
    document.getElementById('edit-user-matricula').value = user.matricula || '';
    document.getElementById('modal-usuario').classList.add('active');
}

document.getElementById('form-edit-usuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    await window.supabaseClient.from('perfis').update({
        nome: document.getElementById('edit-user-nome').value,
        tipo_usuario: document.getElementById('edit-user-tipo').value,
        turma: document.getElementById('edit-user-turma').value,
        matricula: document.getElementById('edit-user-matricula').value
    }).eq('id', id);
    
    fecharModal('modal-usuario');
    carregarUsuarios();
    carregarAlunosSelect();
});

async function excluirUser(id) {
    if(!confirm("CUIDADO: Isso apagará o perfil do banco de dados. O login continuará existindo no Auth, mas o usuário não terá mais acesso aos dados. Deseja continuar?")) return;
    await window.supabaseClient.from('perfis').delete().eq('id', id);
    carregarUsuarios();
    carregarAlunosSelect();
}

function alternarCamposUsuario() {
    const isAluno = document.getElementById('user-tipo').value === 'aluno';
    document.getElementById('campos-aluno-user').style.display = isAluno ? 'block' : 'none';
}

document.getElementById('form-usuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const nome = (formData.get('nome') || '').trim();
    const email = (formData.get('email') || '').trim();
    const senha = formData.get('senha') || '';
    const tipoConta = formData.get('tipo') || 'aluno';
    const turma = (formData.get('turma') || '').trim();
    const matricula = (formData.get('matricula') || '').trim();

    if (senha.length < 6) return alert("Senha muito curta.");

    const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await tempClient.auth.signUp({ email, password: senha, options: { data: { nome, tipo_usuario: tipoConta, turma, matricula } } });
    if (error) return alert("Erro: " + error.message);

    if (data.user) {
        await window.supabaseClient.from('perfis').upsert([{ id: data.user.id, nome, tipo_usuario: tipoConta, turma, matricula }]);
        document.getElementById('form-usuario').reset(); 
        alternarCamposUsuario();
        carregarUsuarios(); 
        carregarAlunosSelect();
    }
});

// ==========================================
// 4. EMPRÉSTIMOS (Editar data e Cancelar)
// ==========================================
async function carregarEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).eq('devolvido', false);
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

    if (lista.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum empréstimo.</td></tr>`;

    lista.forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        let isAtraso = dDev < hoje;
        tbody.innerHTML += `
            <tr class="${isAtraso ? 'linha-atraso' : ''}">
                <td>${e.livros?.titulo || 'Excluído'}</td><td>${e.perfis?.nome || e.nome_aluno || '?'}</td>
                <td>${dDev.toLocaleDateString('pt-BR')}</td>
                <td><span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span></td>
                <td>
                    <button class="btn-devolver" onclick="devolver(${e.id}, ${e.livro_id})">Devolver</button>
                    <button class="btn-action" style="background:#EF4444; padding: 6px 10px; font-size:12px;" onclick="cancelarEmprestimo(${e.id}, ${e.livro_id})">🗑️</button>
                </td>
            </tr>`;
    });
}

// (As funções de filtro de livros, usuários e empréstimos que já existem devem continuar aqui em cima. 
// Por brevidade, não repeti as funções filtrarLivros(), filtrarUsuarios() e filtrarEmprestimos() neste bloco, mas elas devem estar no seu arquivo).

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

async function cancelarEmprestimo(empId, livroId) {
    if(!confirm("Cancelar este empréstimo forçadamente? O livro voltará ao acervo.")) return;
    // Deleta o empréstimo
    await window.supabaseClient.from('emprestimos').delete().eq('id', empId);
    // Libera o livro
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    carregarEmprestimos(); carregarLivros(); carregarRelatorios();
}

// ==========================================
// 5. RELATÓRIOS
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
        tbody.innerHTML += `
            <tr>
                <td>${e.livros?.titulo || 'Excluído'}</td><td>${e.perfis?.nome || e.nome_aluno || '?'}</td>
                <td>${new Date(e.criado_em).toLocaleDateString('pt-BR')}</td>
                <td>${new Date(e.data_devolucao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${e.data_devolucao_real ? new Date(e.data_devolucao_real + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td><span class="${e.devolvido ? 'status-disponivel' : 'status-emprestado'}">${e.devolvido ? 'Devolvido' : 'Ativo'}</span></td>
            </tr>`;
    });
}