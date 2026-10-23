let alunoId = null;

async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    const { data: perfil } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (!perfil || perfil.tipo_usuario !== 'aluno') return window.location.href = 'bibliotecario.html';

    alunoId = session.user.id;
    document.getElementById('user-nome').innerText = perfil.nome;
    
    carregarLivros();
    carregarMeusEmprestimos();
}
init();

function mudarAba(aba, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(event) event.target.classList.add('active');
}

async function carregarLivros() {
    const { data: livros } = await window.supabaseClient.from('livros').select('*').order('titulo');
    const tbody = document.querySelector('#tabela-livros tbody');
    tbody.innerHTML = '';
    (livros || []).forEach(l => {
        tbody.innerHTML += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td><td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
    });
}

async function carregarMeusEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo)`).eq('devolvido', false).eq('aluno_id', alunoId);
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhum empréstimo ativo.</td></tr>`;
        return;
    }
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    data.forEach(e => {
        const dDev = new Date(e.data_devolucao + 'T00:00:00');
        const isAtraso = dDev < hoje;
        tbody.innerHTML += `
            <tr class="${isAtraso ? 'linha-atraso' : ''}">
                <td>${e.livros?.titulo}</td>
                <td>${dDev.toLocaleDateString('pt-BR')}</td>
                <td><span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span></td>
            </tr>
        `;
    });
}