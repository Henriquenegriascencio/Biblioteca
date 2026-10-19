let usuarioAtual = null;

// Proteção da Rota
async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: perfil } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (perfil.tipo_usuario !== 'bibliotecario') return window.location.href = 'aluno.html'; // Se for aluno, expulsa

    usuarioAtual = session.user;
    document.getElementById('user-nome').innerText = perfil.nome;
    
    carregarLivros();
    carregarAlunos();
    carregarEmprestimos();
}
init();

function mudarAba(aba) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    event.target.classList.add('active');
}

// --- LIVROS ---
async function carregarLivros() {
    const { data: livros } = await window.supabaseClient.from('livros').select('*').order('id', { ascending: false });
    const tbody = document.querySelector('#tabela-livros tbody');
    const selectLivro = document.getElementById('select-livro');
    tbody.innerHTML = '';
    selectLivro.innerHTML = '<option value="">Selecione um livro disponível...</option>';
    document.getElementById('total-livros').innerText = livros.length;

    livros.forEach(livro => {
        tbody.innerHTML += `<tr><td>${livro.titulo}</td><td>${livro.autor}</td><td>${livro.categoria || 'Geral'}</td>
            <td><span class="${livro.disponivel ? 'status-disponivel' : 'status-emprestado'}">${livro.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
        if (livro.disponivel) selectLivro.innerHTML += `<option value="${livro.id}">${livro.titulo}</option>`;
    });
}

document.getElementById('form-livro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('titulo').value;
    const autor = document.getElementById('autor').value;
    const categoria = document.getElementById('categoria').value;
    await window.supabaseClient.from('livros').insert([{ titulo, autor, categoria }]);
    document.getElementById('form-livro').reset();
    carregarLivros();
});

// --- ALUNOS E EMPRÉSTIMOS ---
async function carregarAlunos() {
    const { data: alunos } = await window.supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno');
    const select = document.getElementById('select-aluno');
    select.innerHTML = '<option value="">Selecione o Aluno...</option>';
    alunos.forEach(a => select.innerHTML += `<option value="${a.id}">${a.nome}</option>`);
}

async function carregarEmprestimos() {
    const { data: emprestimos } = await window.supabaseClient.from('emprestimos').select(`*, livros (titulo), perfis (nome)`).eq('devolvido', false);
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    let contadorAtrasados = 0;
    document.getElementById('total-emprestados').innerText = emprestimos.length;
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    emprestimos.forEach(emp => {
        const dataDev = new Date(emp.data_devolucao + 'T00:00:00');
        const dataFormatada = dataDev.toLocaleDateString('pt-BR');
        let statusHtml = '<span class="status-disponivel">Em dia</span>';
        let linhaClasse = '';

        if (dataDev < hoje) {
            statusHtml = `<span class="status-atraso">Atrasado</span>`;
            linhaClasse = 'linha-atraso';
            contadorAtrasados++;
        }

        let btnAcoes = `<button class="btn-devolver" onclick="devolverLivro(${emp.id}, ${emp.livro_id})">Devolver</button>`;
        if (dataDev >= hoje) btnAcoes += `<button class="btn-renovar" onclick="renovarEmprestimo(${emp.id}, '${emp.data_devolucao}')">+7 Dias</button>`;

        tbody.innerHTML += `<tr class="${linhaClasse}"><td>${emp.livros.titulo}</td><td>${emp.perfis.nome}</td><td>${dataFormatada}</td><td>${statusHtml}</td><td>${btnAcoes}</td></tr>`;
    });
    document.getElementById('total-atrasados').innerText = contadorAtrasados;
}

document.getElementById('form-emprestimo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const livro_id = document.getElementById('select-livro').value;
    const aluno_id = document.getElementById('select-aluno').value;
    const data_devolucao = document.getElementById('data-devolucao').value;
    
    await window.supabaseClient.from('emprestimos').insert([{ livro_id, aluno_id, data_devolucao }]);
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livro_id);
    
    document.getElementById('form-emprestimo').reset();
    carregarEmprestimos();
    carregarLivros();
});

async function devolverLivro(emprestimo_id, livro_id) {
    await window.supabaseClient.from('emprestimos').update({ devolvido: true }).eq('id', emprestimo_id);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livro_id);
    carregarEmprestimos(); carregarLivros();
}

async function renovarEmprestimo(emprestimo_id, dataAtualString) {
    const dataAtual = new Date(dataAtualString + 'T00:00:00');
    dataAtual.setDate(dataAtual.getDate() + 7);
    await window.supabaseClient.from('emprestimos').update({ data_devolucao: dataAtual.toISOString().split('T')[0] }).eq('id', emprestimo_id);
    carregarEmprestimos();
}