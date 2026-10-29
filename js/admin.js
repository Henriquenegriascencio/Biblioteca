let tipoUsuario = 'administrador';

// Variáveis globais para guardar os dados e permitir filtragem rápida
let dadosLivros = [];
let dadosEmprestimos = [];
let dadosUsuarios = [];
let dadosRelatorios = [];

// ==========================================
// 1. INICIALIZAÇÃO
// ==========================================
async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    
    // Segurança: Apenas administradores entram aqui
    if (!p || p.tipo_usuario !== 'administrador') return window.location.href = 'index.html';

    document.getElementById('user-nome').innerText = p.nome;
    
    carregarLivros();
    carregarAlunosSelect();
    carregarUsuarios();
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

function filtrarLivros() {
    const tipoFiltro = document.getElementById('select-filtro-livros').value;
    const termo = document.getElementById('filtro-livros').value.toLowerCase();
    
    if (termo === '' || tipoFiltro === 'todos') {
        renderizarLivros(dadosLivros);
        return;
    }

    const filtrados = dadosLivros.filter(l => {
        if (tipoFiltro === 'titulo') return l.titulo.toLowerCase().includes(termo);
        if (tipoFiltro === 'autor') return l.autor.toLowerCase().includes(termo);
        if (tipoFiltro === 'categoria') return (l.categoria || '').toLowerCase().includes(termo);
        if (tipoFiltro === 'status') {
            return (l.disponivel ? 'disponivel' : 'emprestado').includes(termo);
        }
        return false;
    });
    renderizarLivros(filtrados);
}

function renderizarLivros(lista) {
    const tbody = document.querySelector('#tabela-livros tbody');
    tbody.innerHTML = '';
    document.getElementById('total-livros').innerText = dadosLivros.length;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Nenhum livro encontrado.</td></tr>`;
        return;
    }
    lista.forEach(l => {
        tbody.innerHTML += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td><td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
    });
}

document.getElementById('form-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.supabaseClient.from('livros').insert([{ titulo: document.getElementById('titulo').value, autor: document.getElementById('autor').value, categoria: document.getElementById('categoria').value }]);
    document.getElementById('form-livro').reset(); 
    alert("Livro cadastrado!");
    carregarLivros();
});

// ==========================================
// 3. USUÁRIOS (Aqui o Admin pode filtrar por tipo)
// ==========================================
async function carregarAlunosSelect() {
    // Select de empréstimo só precisa de alunos
    const { data } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno').order('nome');
    const select = document.getElementById('select-aluno');
    if (select) {
        select.innerHTML = '<option value="">Selecione o Aluno...</option>';
        (data || []).forEach(a => select.innerHTML += `<option value="${a.id}">${a.nome} ${a.turma ? '- ' + a.turma : ''}</option>`);
    }
}

async function carregarUsuarios() {
    // Tabela de gestão mostra todo mundo
    const { data } = await window.supabaseClient.from('perfis').select('*').order('nome');
    dadosUsuarios = data || [];
    renderizarUsuarios(dadosUsuarios);
}

function filtrarUsuarios() {
    const tipoFiltro = document.getElementById('select-filtro-usuarios').value;
    const termo = document.getElementById('filtro-usuarios').value.toLowerCase();
    
    if (termo === '' || tipoFiltro === 'todos') {
        renderizarUsuarios(dadosUsuarios);
        return;
    }

    const filtrados = dadosUsuarios.filter(u => {
        if (tipoFiltro === 'nome') return u.nome.toLowerCase().includes(termo);
        if (tipoFiltro === 'turma') return (u.turma || '').toLowerCase().includes(termo);
        if (tipoFiltro === 'matricula') return (u.matricula || '').toLowerCase().includes(termo);
        if (tipoFiltro === 'tipo') return (u.tipo_usuario || '').toLowerCase().includes(termo);
        return false;
    });
    renderizarUsuarios(filtrados);
}

function renderizarUsuarios(lista) {
    const tbody = document.querySelector('#tabela-usuarios tbody');
    tbody.innerHTML = '';
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Nenhum usuário encontrado.</td></tr>`;
        return;
    }
    lista.forEach(u => {
        const badge = u.tipo_usuario === 'administrador' ? '👑 Admin' : u.tipo_usuario === 'bibliotecario' ? '📚 Biblio' : '🎒 Aluno';
        tbody.innerHTML += `<tr><td>${u.nome}</td><td><strong>${badge}</strong></td><td>${u.turma || '-'}</td><td>${u.matricula || '-'}</td></tr>`;
    });
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
        alert(`Conta de ${nome} criada!`);
        document.getElementById('form-usuario').reset(); 
        alternarCamposUsuario();
        carregarUsuarios(); 
        carregarAlunosSelect();
    }
});

// ==========================================
// 4. EMPRÉSTIMOS
// ==========================================
async function carregarEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).eq('devolvido', false);
    dadosEmprestimos = data || [];
    renderizarEmprestimos(dadosEmprestimos);
}

function filtrarEmprestimos() {
    const tipoFiltro = document.getElementById('select-filtro-emprestimos').value;
    const termo = document.getElementById('filtro-emprestimos').value.toLowerCase();
    
    if (termo === '' || tipoFiltro === 'todos') {
        renderizarEmprestimos(dadosEmprestimos);
        return;
    }

    const hoje = new Date(); hoje.setHours(0,0,0,0);

    const filtrados = dadosEmprestimos.filter(e => {
        if (tipoFiltro === 'livro') return (e.livros?.titulo || '').toLowerCase().includes(termo);
        if (tipoFiltro === 'aluno') return (e.perfis?.nome || e.nome_aluno || '').toLowerCase().includes(termo);
        if (tipoFiltro === 'status') {
            const dDev = new Date(e.data_devolucao + 'T00:00:00');
            const status = dDev < hoje ? 'atrasado' : 'em dia';
            return status.includes(termo);
        }
        return false;
    });
    renderizarEmprestimos(filtrados);
}

function renderizarEmprestimos(lista) {
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = ''; 
    document.getElementById('total-emprestados').innerText = dadosEmprestimos.length;
    
    let atrasados = 0; 
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    dadosEmprestimos.forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        if (dDev < hoje) atrasados++;
    });
    document.getElementById('total-atrasados').innerText = atrasados;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum empréstimo encontrado.</td></tr>`;
        return;
    }

    lista.forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        let isAtraso = dDev < hoje;
        tbody.innerHTML += `
            <tr class="${isAtraso ? 'linha-atraso' : ''}">
                <td>${e.livros?.titulo || 'Excluído'}</td><td>${e.perfis?.nome || e.nome_aluno || '?'}</td>
                <td>${dDev.toLocaleDateString('pt-BR')}</td>
                <td><span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span></td>
                <td><button class="btn-devolver" onclick="devolver(${e.id}, ${e.livro_id})">Devolver</button></td>
            </tr>`;
    });
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
    carregarEmprestimos(); 
    carregarLivros();
});

async function devolver(empId, livroId) {
    const hoje = new Date().toISOString().split('T')[0];
    await window.supabaseClient.from('emprestimos').update({ devolvido: true, data_devolucao_real: hoje }).eq('id', empId);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    carregarEmprestimos(); 
    carregarLivros(); 
    carregarRelatorios();
}

// ==========================================
// 5. RELATÓRIOS
// ==========================================
async function carregarRelatorios() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).order('id', { ascending: false });
    dadosRelatorios = data || [];
    renderizarRelatorios(dadosRelatorios);
}

function filtrarRelatorios() {
    const tipoFiltro = document.getElementById('select-filtro-relatorios').value;
    const termo = document.getElementById('filtro-relatorios').value.toLowerCase();
    
    if (termo === '' || tipoFiltro === 'todos') {
        renderizarRelatorios(dadosRelatorios);
        return;
    }

    const filtrados = dadosRelatorios.filter(e => {
        if (tipoFiltro === 'livro') return (e.livros?.titulo || '').toLowerCase().includes(termo);
        if (tipoFiltro === 'aluno') return (e.perfis?.nome || e.nome_aluno || '').toLowerCase().includes(termo);
        if (tipoFiltro === 'status') {
            const status = e.devolvido ? 'devolvido' : 'ativo';
            return status.includes(termo);
        }
        if (tipoFiltro === 'data') {
            const dataEmp = new Date(e.criado_em).toLocaleDateString('pt-BR');
            return dataEmp.includes(termo);
        }
        return false;
    });
    renderizarRelatorios(filtrados);
}

function renderizarRelatorios(lista) {
    const tbody = document.querySelector('#tabela-relatorios tbody');
    tbody.innerHTML = '';
    
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 20px;">Nenhum registro encontrado.</td></tr>`;
        return;
    }
    
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