let alunoId = null;

async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';
    
    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (!p || p.tipo_usuario !== 'aluno') return window.location.href = 'index.html';
    
    alunoId = session.user.id;
    document.getElementById('user-nome').innerText = p.nome;
    
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
    const { data } = await window.supabaseClient.from('livros').select('*').order('titulo');
    const tbody = document.querySelector('#tabela-livros tbody');
    tbody.innerHTML = '';
    (data || []).forEach(l => {
        tbody.innerHTML += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.categoria}</td><td><span class="${l.disponivel ? 'status-disponivel' : 'status-emprestado'}">${l.disponivel ? 'Disponível' : 'Emprestado'}</span></td></tr>`;
    });
}

async function carregarMeusEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo)`).eq('devolvido', false).eq('aluno_id', alunoId);
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 20px;">Você não tem empréstimos ativos.</td></tr>`;
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
                <td><button class="btn-devolver" onclick="devolverLivroAluno(${e.id}, ${e.livro_id})">Devolver</button></td>
            </tr>
        `;
    });
}

async function devolverLivroAluno(empId, livroId) {
    if(!confirm("Entregou o livro fisicamente na biblioteca? Confirme a devolução.")) return;
    const hoje = new Date().toISOString().split('T')[0];
    await window.supabaseClient.from('emprestimos').update({ devolvido: true, data_devolucao_real: hoje }).eq('id', empId);
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    alert("Devolução registrada!");
    carregarMeusEmprestimos();
    carregarLivros();
}