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
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(event) event.target.closest('.nav-link').classList.add('active'); 
}

// Variável global para guardar os livros e facilitar a pesquisa
let todosOsLivros = [];

// 1. BUSCA NO BANCO E SALVA NA MEMÓRIA
async function carregarEstanteLivros() {
    const { data: livros, error } = await window.supabaseClient.from('livros').select('*').order('titulo');
    const container = document.getElementById('estante-container');
    
    if (error || !livros || livros.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum livro cadastrado ainda.</p>`;
        return;
    }

    // Salva a lista completa
    todosOsLivros = livros;
    
    // Manda desenhar a estante com todos os livros
    renderizarEstante(todosOsLivros);
}

// 2. FILTRA OS LIVROS CONFORME DIGITA NA LUPA
function filtrarLivros() {
    const termo = document.getElementById('search-input').value.toLowerCase().trim();
    
    // Se a barra estiver vazia, mostra todos
    if (termo === '') {
        renderizarEstante(todosOsLivros);
        return;
    }

    // Filtra por Título, Autor ou Categoria
    const livrosFiltrados = todosOsLivros.filter(livro => 
        livro.titulo.toLowerCase().includes(termo) || 
        livro.autor.toLowerCase().includes(termo) || 
        (livro.categoria && livro.categoria.toLowerCase().includes(termo))
    );

    renderizarEstante(livrosFiltrados);
}

// 3. DESENHA A ESTANTE NA TELA (Separa por categoria e monta as prateleiras)
function renderizarEstante(livrosParaMostrar) {
    const container = document.getElementById('estante-container');
    
    if (livrosParaMostrar.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum livro encontrado com esse termo.</p>`;
        return;
    }

    // Agrupa os livros por categoria
    const categorias = {};
    livrosParaMostrar.forEach(livro => {
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
            
            const corAleatoria = Math.floor(Math.random() * 6) + 1;
            const classeCor = `livro-cor-${corAleatoria}`;
            
            html += `
                <div class="livro-wrapper">
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

async function pegarEmprestado(livroId, titulo) {
    if (!confirm(`Deseja solicitar o empréstimo do livro "${titulo}"?\n\nAguarde a aprovação do bibliotecário.`)) {
        return;
    }

    // 1. Registra a solicitação como PENDENTE
    const { error: erroEmp } = await window.supabaseClient.from('emprestimos').insert([{ 
        livro_id: livroId, 
        aluno_id: alunoId, 
        status: 'pendente',
        nome_aluno: document.getElementById('user-nome').innerText
    }]);

    if (erroEmp) return alert("Erro ao solicitar livro: " + erroEmp.message);

    // 2. Reserva o livro (para ninguém mais pegar enquanto o bibliotecário não aprova)
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livroId);

    alert(`Solicitação enviada! Fale com o bibliotecário para retirar o livro.`);
    
    carregarEstanteLivros();
    carregarMeusEmprestimos();
    mudarAba('meus-emprestimos', { target: document.querySelectorAll('.nav-link')[1] });
}

async function carregarMeusEmprestimos() {
    // Busca todos, exceto os recusados e devolvidos
    const { data } = await window.supabaseClient.from('emprestimos')
        .select(`*, livros(titulo)`)
        .eq('aluno_id', alunoId)
        .in('status', ['pendente', 'ativo']);
        
    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 20px;">Você não tem empréstimos ou solicitações.</td></tr>`;
        return;
    }
    
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    
    data.forEach(e => {
        let statusHtml = '';
        let acaoHtml = '';
        
        if (e.status === 'pendente') {
            statusHtml = `<span class="status-emprestado">⏳ Aguardando Aprovação</span>`;
            acaoHtml = `<button class="btn-devolver btn-action" style="background:#EF4444;" onclick="cancelarSolicitacao(${e.id}, ${e.livro_id})">Cancelar</button>`;
        } else if (e.status === 'ativo') {
            const dDev = new Date(e.data_devolucao + 'T00:00:00');
            const isAtraso = dDev < hoje;
            statusHtml = `<span class="${isAtraso ? 'status-atraso' : 'status-disponivel'}">${isAtraso ? 'Atrasado' : 'Em dia'}</span>`;
            acaoHtml = `<button class="btn-devolver btn-action" style="background:#17a2b8;" onclick="devolverLivroAluno(${e.id}, ${e.livro_id})">Devolver</button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${e.livros?.titulo}</td>
                <td>${e.status === 'ativo' ? new Date(e.data_devolucao + 'T00:00:00').toLocaleDateString('pt-BR') : 'Aguardando'}</td>
                <td>${statusHtml}</td>
                <td>${acaoHtml}</td>
            </tr>
        `;
    });
}

// NOVA FUNÇÃO: Aluno cancela a solicitação antes de ser aprovada
async function cancelarSolicitacao(empId, livroId) {
    if(!confirm("Deseja realmente cancelar esta solicitação?")) return;
    
    // Apaga o registro pendente
    await window.supabaseClient.from('emprestimos').delete().eq('id', empId);
    // Libera o livro novamente
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livroId);
    
    alert("Solicitação cancelada.");
    carregarMeusEmprestimos();
    carregarEstanteLivros();
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

