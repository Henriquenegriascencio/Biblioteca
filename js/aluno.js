let usuarioAtual = null;

// Proteção da Rota
async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: perfil } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (perfil.tipo_usuario !== 'aluno') return window.location.href = 'bibliotecario.html'; // Se for bib, expulsa

    usuarioAtual = session.user;
    document.getElementById('user-nome').innerText = perfil.nome;
    
    carregarLivros();
    carregarMeusEmprestimos();
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
    const { data: livros } = await window.supabaseClient.from('livros').select('*').order('titulo');
    const tbody = document.querySelector('#tabela-livros tbody');
    tbody.innerHTML = '';
    
    livros.forEach(livro => {
        tbody.innerHTML += `<tr><td>${livro.titulo}</td><td>${livro.autor}</td><td>${livro.categoria || 'Geral'}</td>
            <td><span class="${livro.disponivel ? 'status-disponivel' : 'status-emprestado'}">${livro.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
    });
}

// --- MEUS EMPRÉSTIMOS ---
async function carregarMeusEmprestimos() {
    // Busca apenas os empréstimos onde o aluno_id é igual ao ID do usuário logado
    const { data: emprestimos } = await window.supabaseClient
        .from('emprestimos')
        .select(`*, livros (titulo)`)
        .eq('devolvido', false)
        .eq('aluno_id', usuarioAtual.id);

    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    if (emprestimos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Você não tem empréstimos ativos no momento.</td></tr>`;
        return;
    }

    emprestimos.forEach(emp => {
        const dataDev = new Date(emp.data_devolucao + 'T00:00:00');
        const dataFormatada = dataDev.toLocaleDateString('pt-BR');
        let statusHtml = '<span class="status-disponivel">Em dia</span>';
        let linhaClasse = '';

        if (dataDev < hoje) {
            statusHtml = `<span class="status-atraso">Atrasado!</span>`;
            linhaClasse = 'linha-atraso';
        }

        tbody.innerHTML += `<tr class="${linhaClasse}"><td>${emp.livros.titulo}</td><td>${dataFormatada}</td><td>${statusHtml}</td></tr>`;
    });
}