let usuarioAtual = null;
let tipoUsuario = 'aluno';

// Função que roda ao abrir a página
async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    // 1. Se não estiver logado, vai pro login
    if (!session) return window.location.href = 'index.html';

    // 2. Descobre quem é o usuário
    const { data: perfil } = await window.supabaseClient
        .from('perfis')
        .select('*')
        .eq('id', session.user.id)
        .single();

    // 3. Se for aluno (ou não tiver perfil), é expulso para a tela de aluno
    if (!perfil || perfil.tipo_usuario === 'aluno') {
        return window.location.href = 'aluno.html';
    }

    // 4. Configura a tela baseada no cargo
    usuarioAtual = session.user;
    tipoUsuario = perfil.tipo_usuario;
    document.getElementById('user-nome').innerText = perfil.nome || 'Usuário';

    if (tipoUsuario === 'administrador') {
        // Admin vê o título de Admin e a opção de criar bibliotecário
        document.getElementById('opt-bibliotecario').style.display = 'block';
        document.querySelector('.header h1').innerText = '👑 Painel do Administrador';
    } else {
        // Bibliotecário comum não vê a opção de criar bibliotecário
        document.getElementById('opt-bibliotecario').style.display = 'none';
        document.querySelector('.header h1').innerText = '📚 Painel do Bibliotecário';
    }

    // 5. Carrega os dados
    carregarLivros();
    carregarAlunos();
    carregarEmprestimos();
}
init();

// Função para esconder os campos de turma se for criar um Bibliotecário
function alternarCamposUsuario() {
    const tipo = document.getElementById('user-tipo').value;
    const campos = document.getElementById('campos-aluno-user');
    const inputTurma = document.getElementById('user-turma');
    const inputMatricula = document.getElementById('user-matricula');

    if (tipo === 'aluno') {
        campos.style.display = 'block';
        inputTurma.required = true;
        inputMatricula.required = true;
    } else {
        campos.style.display = 'none';
        inputTurma.required = false;
        inputMatricula.required = false;
        inputTurma.value = '';
        inputMatricula.value = '';
    }
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
    // Traz todos os alunos ordenados por nome
    const { data: alunos } = await window.supabaseClient
        .from('perfis')
        .select('*')
        .eq('tipo_usuario', 'aluno')
        .order('nome');

    const select = document.getElementById('select-aluno');
    select.innerHTML = '<option value="">Selecione o Aluno...</option>';
    
    if (alunos) {
        alunos.forEach(a => {
            // Monta o texto: João Silva (1º Ano A) - Mat: 12345
            const turmaTexto = a.turma ? ` - ${a.turma}` : '';
            const matTexto = a.matricula ? ` - Mat: ${a.matricula}` : '';
            select.innerHTML += `<option value="${a.id}">${a.nome}${turmaTexto}${matTexto}</option>`;
        });
    }
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

document.getElementById('form-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('user-nome').value;
    const email = document.getElementById('user-email').value;
    const senha = document.getElementById('user-senha').value;
    const tipoConta = document.getElementById('user-tipo').value;
    const turma = document.getElementById('user-turma').value;
    const matricula = document.getElementById('user-matricula').value;

    const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { error } = await tempClient.auth.signUp({
        email: email,
        password: senha,
        options: { 
            data: { 
                nome: nome, 
                tipo_usuario: tipoConta,
                turma: turma,
                matricula: matricula
            } 
        }
    });

    if (error) {
        alert("Erro ao cadastrar usuário: " + error.message);
    } else {
        alert(`Conta criada com sucesso para ${nome}!`);
        document.getElementById('form-usuario').reset();
        alternarCamposUsuario(); // Reseta o form visualmente
        if (tipoConta === 'aluno') carregarAlunos(); // Atualiza o select de empréstimo
    }
});

    if (error) {
        alert("Erro ao cadastrar aluno: " + error.message);
    } else {
        alert(`Aluno ${nome} cadastrado com sucesso!`);
        document.getElementById('form-aluno').reset();
        carregarAlunos(); // Atualiza o select de empréstimos
    };

function alternarCamposUsuario() {
    const tipo = document.getElementById('user-tipo').value;
    const campos = document.getElementById('campos-aluno-user');
    const inputTurma = document.getElementById('user-turma');
    const inputMatricula = document.getElementById('user-matricula');

    if (tipo === 'aluno') {
        campos.style.display = 'block';
        inputTurma.required = true;
        inputMatricula.required = true;
    } else {
        campos.style.display = 'none';
        inputTurma.required = false;
        inputMatricula.required = false;
        inputTurma.value = '';
        inputMatricula.value = '';
    }
}