let alunoId = null;

async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';
    
    const { data: p } = await window.supabaseClient.from('perfis').select('*').eq('id', session.user.id).single();
    if (!p || p.tipo_usuario !== 'aluno') return window.location.href = 'index.html';
    
    alunoId = session.user.id;
    document.getElementById('user-nome').innerText = p.nome;
    
    carregarEstanteLivros();
    carregarMeusEmprestimos();
}
init();

function mudarAba(aba, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(event) event.target.classList.add('active');
}

// ==========================================
// CARREGAR ESTANTE (AGRUPADO POR CATEGORIA)
// ==========================================
async function carregarEstanteLivros() {
    const { data: livros, error } = await window.supabaseClient.from('livros').select('*').order('titulo');
    const container = document.getElementById('estante-container');
    
    if (error || !livros || livros.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum livro cadastrado na biblioteca ainda.</p>`;
        return;
    }

    // Agrupa os livros por categoria
    const categorias = {};
    livros.forEach(livro => {
        const cat = livro.categoria || 'Geral';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(livro);
    });

    let html = '<div class="estante-wrapper">';

    for (const [categoria, livrosDaCat] of Object.entries(categorias)) {
        html += `
            <div class="categoria-secao">
                <h3 class="categoria-titulo">📚 ${categoria}</h3>
                <div class="prateleira">
        `;

        livrosDaCat.forEach(livro => {
            const statusClasse = livro.disponivel ? 'disponivel' : 'emprestado';
            const acaoClique = livro.disponivel ? `onclick="pegarEmprestado(${livro.id}, '${livro.titulo.replace(/'/g, "\\'")}')"` : '';
            
            // Sorteia uma cor de 1 a 6 para a lombada do livro
            const corAleatoria = Math.floor(Math.random() * 6) + 1;
            const classeCor = `livro-cor-${corAleatoria}`;
            
            html += `
                <div class="livro-wrapper">
                    <!-- Aplica a classe da cor sorteada junto com o status -->
                    <div class="livro-lombada ${classeCor} ${statusClasse}" ${acaoClique}>
                        <h4>${livro.titulo}</h4>
                    </div>
                    
                    <div class="livro-tooltip">
                        <h3>${livro.titulo}</h3>
                        <p><strong>Autor:</strong> ${livro.autor}</p>
                        <p><strong>Categoria:</strong> ${livro.categoria || 'Geral'}</p>
                        <p><strong>Status:</strong> <span class="${livro.disponivel ? 'text-green' : 'text-red'}">${livro.disponivel ? 'Disponível' : 'Emprestado'}</span></p>
                        ${livro.disponivel ? '<small style="color: var(--warning); font-weight: bold; margin-top: 8px; display: block; text-align:center;">Clique para pegar (7 dias)</small>' : ''}
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ==========================================
// PEGAR LIVRO EMPRESTADO (AUTOATENDIMENTO)
// ==========================================
async function pegarEmprestado(livroId, titulo) {
    // Calcula a data de devolução (Hoje + 7 dias)
    let dataDevolucao = new Date();
    dataDevolucao.setDate(dataDevolucao.getDate() + 7);
    
    // Formata para AAAA-MM-DD para salvar no banco
    const dataFormatada = dataDevolucao.toISOString().split('T')[0];
    const dataExibicao = dataDevolucao.toLocaleDateString('pt-BR');

    if (!confirm(`Você deseja pegar o livro "${titulo}" emprestado?\n\nO prazo de devolução é de 7 dias.\nData limite: ${dataExibicao}`)) {
        return;
    }

    // 1. Registra o empréstimo no banco
    const { error: erroEmp } = await window.supabaseClient.from('emprestimos').insert([{ 
        livro_id: livroId, 
        aluno_id: alunoId, 
        data_devolucao: dataFormatada,
        nome_aluno: document.getElementById('user-nome').innerText // Salva o nome como backup
    }]);

    if (erroEmp) return alert("Erro ao pegar livro: " + erroEmp.message);

    // 2. Atualiza o livro para Indisponível
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livroId);

    alert(`Boa leitura! O livro "${titulo}" estará disponível para você até ${dataExibicao}.`);
    
    // 3. Atualiza a tela
    carregarEstanteLivros();
    carregarMeusEmprestimos();
    mudarAba('meus-emprestimos', { target: document.querySelectorAll('.tab-btn')[1] });
}

// ==========================================
// MEUS EMPRÉSTIMOS
// ==========================================
async function carregarMeusEmprestimos() {
    const { data } = await window.supabaseClient.from('emprestimos').select(`*, livros(titulo)`).eq('devolvido', false).eq('aluno_id', alunoId);
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 20px;">Você não tem empréstimos ativos no momento. Explore a estante!</td></tr>`;
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
                <td><button class="btn-devolver btn-action" style="background:#17a2b8;" onclick="devolverLivroAluno(${e.id}, ${e.livro_id})">Devolver</button></td>
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
    carregarEstanteLivros();
}

