// --- CONFIGURAÇÃO ---
const SUPABASE_URL = 'https://sysghgyhotgobvbvzjju.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_YoavoW5o3SuMdp-b5Apmhg_GpPEit0O';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioAtual = null;
let tipoUsuario = 'aluno'; // Padrão

// --- 1. CONTROLE DE LOGIN E TELAS ---
async function verificarLogin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        usuarioAtual = session.user;
        // Busca o perfil para saber o nome e o tipo
        const { data: perfil } = await supabaseClient.from('perfis').select('*').eq('id', usuarioAtual.id).single();
        
        if (perfil) {
            document.getElementById('user-nome').innerText = perfil.nome;
            document.getElementById('user-tipo').innerText = perfil.tipo_usuario === 'bibliotecario' ? 'Bibliotecário' : 'Aluno';
            tipoUsuario = perfil.tipo_usuario;
        }

        // Mostra o app e esconde o login
        document.getElementById('tela-auth').style.display = 'none';
        document.getElementById('app-principal').style.display = 'block';

        // Configura a tela baseada no tipo de usuário
        if (tipoUsuario === 'bibliotecario') {
            document.getElementById('secao-cadastro-livro').style.display = 'block';
            document.getElementById('secao-novo-emprestimo').style.display = 'block';
            document.getElementById('titulo-tabela-emprestimos').innerText = 'Todos os Empréstimos';
            carregarAlunosSelect();
        } else {
            document.getElementById('secao-cadastro-livro').style.display = 'none';
            document.getElementById('secao-novo-emprestimo').style.display = 'none';
            document.getElementById('titulo-tabela-emprestimos').innerText = 'Meus Empréstimos';
        }

        carregarLivros();
        carregarEmprestimos();
    } else {
        // Não logado: mostra login, esconde app
        document.getElementById('tela-auth').style.display = 'block';
        document.getElementById('app-principal').style.display = 'none';
    }
}

// Eventos de Login e Registro
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Erro ao entrar: " + error.message);
    else verificarLogin();
});

document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-senha').value;
    const tipo = document.getElementById('reg-tipo').value;

    const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { nome: nome, tipo_usuario: tipo } } // Envia nome e tipo para o Trigger do banco
    });

    if (error) alert("Erro ao cadastrar: " + error.message);
    else {
        alert("Conta criada! Faça login para entrar.");
        document.getElementById('form-registro').reset();
    }
});

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    verificarLogin();
}

// --- 2. CONTROLE DE ABAS ---
function mudarAba(aba) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`aba-${aba}`).classList.add('active');
    event.target.classList.add('active');

    if (aba === 'livros') carregarLivros();
    if (aba === 'emprestimos') carregarEmprestimos();
}

// --- 3. FUNÇÕES DE LIVROS ---
async function carregarLivros() {
    const { data: livros, error } = await supabaseClient.from('livros').select('*').order('id', { ascending: false });
    if (error) return console.error(error);

    const tbody = document.querySelector('#tabela-livros tbody');
    tbody.innerHTML = '';
    
    const selectLivro = document.getElementById('select-livro');
    selectLivro.innerHTML = '<option value="">Selecione um livro disponível...</option>';

    document.getElementById('total-livros').innerText = livros.length;

    livros.forEach(livro => {
        const statusTexto = livro.disponivel ? 'Disponível' : 'Emprestado';
        const statusClasse = livro.disponivel ? 'status-disponivel' : 'status-emprestado';

        tbody.innerHTML += `
            <tr>
                <td>${livro.titulo}</td>
                <td>${livro.autor}</td>
                <td>${livro.categoria || 'Geral'}</td>
                <td><span class="${statusClasse}">${statusTexto}</span></td>
            </tr>
        `;

        if (livro.disponivel) {
            selectLivro.innerHTML += `<option value="${livro.id}">${livro.titulo}</option>`;
        }
    });
}

document.getElementById('form-livro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('titulo').value;
    const autor = document.getElementById('autor').value;
    const categoria = document.getElementById('categoria').value;

    const { error } = await supabaseClient.from('livros').insert([{ titulo, autor, categoria }]);
    if (error) alert("Erro: " + error.message);
    else {
        document.getElementById('form-livro').reset();
        carregarLivros();
    }
});

// --- 4. FUNÇÕES DE EMPRÉSTIMOS ---
async function carregarAlunosSelect() {
    const { data: alunos } = await supabaseClient.from('perfis').select('*').eq('tipo_usuario', 'aluno');
    const select = document.getElementById('select-aluno');
    select.innerHTML = '<option value="">Selecione o Aluno...</option>';
    if(alunos) {
        alunos.forEach(a => {
            select.innerHTML += `<option value="${a.id}">${a.nome}</option>`;
        });
    }
}

async function carregarEmprestimos() {
    // Se for aluno, só busca os empréstimos dele. Se for bibliotecário, busca todos.
    let query = supabaseClient.from('emprestimos').select(`*, livros (titulo), perfis (nome)`).eq('devolvido', false);
    
    if (tipoUsuario === 'aluno') {
        query = query.eq('aluno_id', usuarioAtual.id);
    }

    const { data: emprestimos, error } = await query;
    if (error) return console.error(error);

    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    
    let contadorAtrasados = 0;
    document.getElementById('total-emprestados').innerText = emprestimos.length;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    emprestimos.forEach(emp => {
        const dataDev = new Date(emp.data_devolucao + 'T00:00:00');
        const dataFormatada = dataDev.toLocaleDateString('pt-BR');
        
        let statusHtml = '<span class="status-disponivel">Em dia</span>';
        let linhaClasse = '';
        let btnAcoes = '';

        // Lógica de Atraso
        if (dataDev < hoje) {
            const diffTime = Math.abs(hoje - dataDev);
            const diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            statusHtml = `<span class="status-atraso">Atrasado (${diasAtraso} dias)</span>`;
            linhaClasse = 'linha-atraso';
            contadorAtrasados++;
        }

        // Ações (Apenas Bibliotecário pode devolver/renovar em nome de todos)
        if (tipoUsuario === 'bibliotecario') {
            btnAcoes = `
                <button class="btn-devolver" onclick="devolverLivro(${emp.id}, ${emp.livro_id})">Devolver</button>
            `;
            if (dataDev >= hoje) {
                btnAcoes += `<button class="btn-renovar" onclick="renovarEmprestimo(${emp.id}, '${emp.data_devolucao}')">+7 Dias</button>`;
            }
        } else {
            btnAcoes = `<span style="font-size:12px; color:var(--text-muted);">Falar com a biblioteca</span>`;
        }

        const nomeAluno = emp.perfis ? emp.perfis.nome : 'Desconhecido';

        tbody.innerHTML += `
            <tr class="${linhaClasse}">
                <td>${emp.livros.titulo}</td>
                <td>${nomeAluno}</td>
                <td>${dataFormatada}</td>
                <td>${statusHtml}</td>
                <td>${btnAcoes}</td>
            </tr>
        `;
    });

    document.getElementById('total-atrasados').innerText = contadorAtrasados;
}

document.getElementById('form-emprestimo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const livro_id = document.getElementById('select-livro').value;
    const aluno_id = document.getElementById('select-aluno').value;
    const data_devolucao = document.getElementById('data-devolucao').value;

    if(!livro_id || !aluno_id) return alert("Selecione o livro e o aluno!");

    const { error: erroEmprestimo } = await supabaseClient
        .from('emprestimos')
        .insert([{ livro_id, aluno_id, nome_aluno: document.getElementById('select-aluno').options[document.getElementById('select-aluno').selectedIndex].text, data_devolucao }]);

    if (erroEmprestimo) return alert("Erro: " + erroEmprestimo.message);

    await supabaseClient.from('livros').update({ disponivel: false }).eq('id', livro_id);

    alert("Empréstimo registrado!");
    document.getElementById('form-emprestimo').reset();
    carregarEmprestimos();
    carregarLivros(); 
});

async function devolverLivro(emprestimo_id, livro_id) {
    if(!confirm("Confirmar devolução do livro?")) return;
    await supabaseClient.from('emprestimos').update({ devolvido: true }).eq('id', emprestimo_id);
    await supabaseClient.from('livros').update({ disponivel: true }).eq('id', livro_id);
    carregarEmprestimos();
    carregarLivros(); 
}

async function renovarEmprestimo(emprestimo_id, dataAtualString) {
    const dataAtual = new Date(dataAtualString + 'T00:00:00');
    dataAtual.setDate(dataAtual.getDate() + 7);
    const novaData = dataAtual.toISOString().split('T')[0];

    const { error } = await supabaseClient.from('emprestimos').update({ data_devolucao: novaData }).eq('id', emprestimo_id);
    if (!error) {
        alert("Empréstimo renovado por mais 7 dias!");
        carregarEmprestimos();
    }
}

// Inicia a verificação ao carregar a página
verificarLogin();