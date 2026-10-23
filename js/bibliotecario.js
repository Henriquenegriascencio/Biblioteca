async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';
    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (!p || p.tipo_usuario !== 'bibliotecario') return window.location.href = 'index.html'; // Expulsa Admin

    document.getElementById('user-nome').innerText = p.nome;
    carregarLivros(); carregarAlunos(); carregarEmprestimos(); carregarRelatorios(); carregarTodosUsuarios();
}
init();

function mudarAba(aba, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(event) event.target.classList.add('active');
}

async function carregarLivros() {
    const { data } = await window.supabaseClient.from('livros').select('*').order('id', { ascending: false });
    const tbody = document.querySelector('#tabela-livros tbody');
    const select = document.getElementById('select-livro');
    tbody.innerHTML = ''; select.innerHTML = '<option value="">Livro...</option>';
    document.getElementById('total-livros').innerText = data ? data.length : 0;
    (data || []).forEach(l => {
        tbody.innerHTML += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td><td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
        if (l.disponivel) select.innerHTML += `<option value="${l.id}">${l.titulo}</option>`;
    });
}

document.getElementById('form-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.supabaseClient.from('livros').insert([{ titulo: document.getElementById('titulo').value, autor: document.getElementById('autor').value, categoria: document.getElementById('categoria').value }]);
    document.getElementById('form-livro').reset(); carregarLivros(); alert("Livro cadastrado!");
});

async function carregarAlunos() {
    const { data } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno').order('nome');
    const select = document.getElementById('select-aluno');
    select.innerHTML = '<option value="">Aluno...</option>';
    (data || []).forEach(a => select.innerHTML += `<option value="${a.id}">${a.nome} ${a.turma ? '- ' + a.turma : ''}</option>`);
}

function alternarCamposUsuario() {
    document.getElementById('campos-aluno-user').style.display = 'block'; // Sempre visível, pois só cria aluno
}

async function carregarTodosUsuarios() {
    const { data } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno').order('nome');
    const tbody = document.querySelector('#tabela-usuarios tbody');
    tbody.innerHTML = '';
    (data || []).forEach(u => {
        tbody.innerHTML += `<tr><td>${u.nome}</td><td>${u.turma || '-'}</td><td>${u.matricula || '-'}</td></tr>`;
    });
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
    // O BIBLIOTECÁRIO SÓ PODE CRIAR ALUNO (Forçado no código)
    const { data, error } = await tempClient.auth.signUp({ email, password: senha, options: { data: { nome, tipo_usuario: 'aluno', turma, matricula } } });
    
    if (error) return alert("Erro: " + error.message);

    if (data.user) {
        await window.supabaseClient.from('perfis').upsert([{ id: data.user.id, nome, tipo_usuario: 'aluno', turma, matricula }]);
        alert(`Aluno ${nome} criado!`);
        document.getElementById('form-usuario').reset(); carregarTodosUsuarios(); carregarAlunos();
    }
});

async function carregarEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).eq('devolvido', false);
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = ''; document.getElementById('total-emprestados').innerText = data ? data.length : 0;
    let atrasados = 0; const hoje = new Date(); hoje.setHours(0,0,0,0);
    (data || []).forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        let isAtraso = dDev < hoje; if (isAtraso) atrasados++;
        tbody.innerHTML += `
            <tr class="${isAtraso ? 'linha-atraso' : ''}">
                <td>${e.livros?.titulo || 'Excluído'}</td><td>${e.perfis?.nome || e.nome_aluno || '?'}</td>
                <td>${dDev.toLocaleDateString('pt-BR')}</td>
                <td><span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span></td>
                <td><button class="btn-devolver" onclick="devolver(${e.id}, ${e.livro_id})">Devolver</button></td>
            </tr>`;
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
    document.getElementById('form-emprestimo').reset(); carregarEmprestimos(); carregarLivros();
});

async function devolver(empId, livroId) {
    const hoje = new Date().toISOString().split('T')[0];
    await window.supabaseClient.from('emprestimos').update({ devolvido: true, data_devolucao_real: hoje }).eq('id', empId);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    carregarEmprestimos(); carregarLivros(); carregarRelatorios();
}

async function carregarRelatorios() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo), perfis(nome)`).order('id', { ascending: false });
    const tbody = document.querySelector('#tabela-relatorios tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 20px;">Nenhum empréstimo registrado no sistema até o momento.</td></tr>`;
        return;
    }
    data.forEach(e => {
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