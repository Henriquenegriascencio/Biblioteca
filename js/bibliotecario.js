let usuarioAtual = null;
let tipoUsuario = 'aluno';

async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (!session) return window.location.href = 'index.html';

    const { data: perfil } = await window.supabaseClient
        .from('perfis')
        .select('*')
        .eq('id', session.user.id)
        .single();

    // Se for aluno, chuta de volta para a página de aluno
    if (!perfil || perfil.tipo_usuario === 'aluno') {
        return window.location.href = 'aluno.html';
    }

    // Se chegou aqui, é Bibliotecário ou Administrador
    usuarioAtual = session.user;
    tipoUsuario = perfil.tipo_usuario;
    document.getElementById('user-nome').innerText = perfil.nome || 'Usuário';

       // Se for Admin OU Bibliotecário, libera a opção de criar bibliotecário
       if (tipoUsuario === 'administrador' || tipoUsuario === 'bibliotecario') {
        document.getElementById('opt-bibliotecario').style.display = 'block';
    }
    
    if (tipoUsuario === 'administrador') {
        document.querySelector('.header h1').innerText = '👑 Painel do Administrador';
    } else {
        document.querySelector('.header h1').innerText = '📚 Painel do Bibliotecário';
    }

    carregarLivros();
    carregarAlunos();
    carregarEmprestimos();
}
init();

function mudarAba(aba) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`aba-${aba}`).classList.add('active');
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    // Carrega os dados de cada aba ao clicar
    if (aba === 'livros') carregarLivros();
    if (aba === 'emprestimos') carregarEmprestimos();
    if (aba === 'relatorios') carregarRelatorios(); // Nova linha!
}

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

document.getElementById('form-emprestimo').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectLivro = document.getElementById('select-livro');
    const selectAluno = document.getElementById('select-aluno');
    
    const livro_id = selectLivro.value;
    const aluno_id = selectAluno.value;
    const data_devolucao = document.getElementById('data-devolucao').value;

    // Validação para garantir que nada vai vazio
    if (!livro_id || !aluno_id) {
        return alert("Por favor, selecione o livro e o aluno corretamente!");
    }

    // Pega o nome do aluno que está escrito na opção do select
    const nome_aluno = selectAluno.options[selectAluno.selectedIndex].text;

    // Insere no banco salvando o ID e o Nome por segurança
    const { error: erroEmprestimo } = await window.supabaseClient
        .from('emprestimos')
        .insert([{ 
            livro_id: livro_id, 
            aluno_id: aluno_id, 
            nome_aluno: nome_aluno, 
            data_devolucao: data_devolucao 
        }]);

    if (erroEmprestimo) {
        return alert("Erro ao registrar empréstimo: " + erroEmprestimo.message);
    }

    // Atualiza o livro para indisponível
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livro_id);

    alert("Empréstimo registrado com sucesso!");
    document.getElementById('form-emprestimo').reset();
    
    carregarEmprestimos();
    carregarLivros(); 
});

async function carregarAlunos() {
    const { data: alunos } = await window.supabaseClient
        .from('perfis')
        .select('*')
        .eq('tipo_usuario', 'aluno')
        .order('nome');

    const select = document.getElementById('select-aluno');
    select.innerHTML = '<option value="">Selecione o Aluno...</option>';
    
    if (alunos) {
        alunos.forEach(a => {
            // Se o nome for nulo por algum motivo, mostra "Aluno sem nome"
            const nomeSeguro = a.nome ? a.nome : 'Aluno sem nome';
            const turmaTexto = a.turma ? ` - ${a.turma}` : '';
            const matTexto = a.matricula ? ` - Mat: ${a.matricula}` : '';
            
            select.innerHTML += `<option value="${a.id}">${nomeSeguro}${turmaTexto}${matTexto}</option>`;
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
        // Se achar o perfil na tabela, usa ele. Se não, usa o nome que foi salvo no empréstimo. Se não tiver nenhum, usa 'Aluno Desconhecido'.
const nomeAluno = emp.perfis?.nome || emp.nome_aluno || 'Aluno Desconhecido';
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

async function carregarEmprestimos() {
    const { data: emprestimos, error } = await window.supabaseClient
        .from('emprestimos')
        .select(`*, livros (titulo), perfis (nome)`)
        .eq('devolvido', false);

    // PROTEÇÃO: Se der erro, mostra no console e usa um array vazio
    if (error) {
        console.error("Erro ao carregar empréstimos:", error);
        return; 
    }

    // PROTEÇÃO: Garante que 'emprestimos' seja um array, mesmo se vier null
    const listaEmprestimos = emprestimos || []; 

    const tbody = document.querySelector('#tabela-emprestimos tbody');
    tbody.innerHTML = '';
    
    let contadorAtrasados = 0;
    document.getElementById('total-emprestados').innerText = listaEmprestimos.length;
    // ... resto do código usando 'listaEmprestimos' ...
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
    if(!confirm("Confirmar devolução do livro?")) return;
    
    // Pega a data de hoje no formato AAAA-MM-DD
    const hoje = new Date().toISOString().split('T')[0];

    // Marca como devolvido E salva a data real
    await window.supabaseClient.from('emprestimos')
        .update({ devolvido: true, data_devolucao_real: hoje })
        .eq('id', emprestimo_id);
        
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livro_id);
    
    alert("Livro devolvido com sucesso!");
    carregarEmprestimos(); 
    carregarLivros();
    carregarRelatorios(); // Atualiza os relatórios em segundo plano
}

async function renovarEmprestimo(emprestimo_id, dataAtualString) {
    const dataAtual = new Date(dataAtualString + 'T00:00:00');
    dataAtual.setDate(dataAtual.getDate() + 7);
    await window.supabaseClient.from('emprestimos').update({ data_devolucao: dataAtual.toISOString().split('T')[0] }).eq('id', emprestimo_id);
    carregarEmprestimos();
}

document.getElementById('form-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // PROTEÇÃO: Pega os elementos e verifica se existem
    const inputNome = document.getElementById('user-nome');
    const inputEmail = document.getElementById('user-email');
    const inputSenha = document.getElementById('user-senha');
    const selectTipo = document.getElementById('user-tipo');
    const inputTurma = document.getElementById('user-turma');
    const inputMatricula = document.getElementById('user-matricula');

    if (!inputNome || !inputEmail || !inputSenha || !selectTipo) {
        return alert("Erro interno: O formulário não foi encontrado na página.");
    }

    const nome = inputNome.value.trim();
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;
    const tipoConta = selectTipo.value;
    const turma = inputTurma ? inputTurma.value : '';
    const matricula = inputMatricula ? inputMatricula.value : '';

    if (error) {
        return alert("Erro ao cadastrar usuário: " + error.message);
    } 

    // 2. GARANTIA EXTRA: Atualiza o perfil na tabela para garantir que o nome foi salvo
    if (data && data.user) {
        await window.supabaseClient.from('perfis').upsert({
            id: data.user.id,
            nome: nome,
            tipo_usuario: tipoConta,
            turma: turma,
            matricula: matricula
        });
    }

    alert(`Conta criada com sucesso para ${nome}!`);
    document.getElementById('form-usuario').reset();
    alternarCamposUsuario(); 
    
    if (tipoConta === 'aluno') {
        carregarAlunos(); 
    }
});
    

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

// --- RELATÓRIOS ---
async function carregarRelatorios() {
    // Busca TODOS os empréstimos (sem filtro), do mais recente para o mais antigo
    const { data: historico, error } = await window.supabaseClient
        .from('emprestimos')
        .select(`*, livros (titulo), perfis (nome)`)
        .order('id', { ascending: false });

    if (error) return console.error(error);

    const tbody = document.querySelector('#tabela-relatorios tbody');
    tbody.innerHTML = '';
    
    const hoje = new Date(); 
    hoje.setHours(0, 0, 0, 0);

    historico.forEach(emp => {
        const dataEmp = new Date(emp.criado_em).toLocaleDateString('pt-BR');
        const dataPrev = new Date(emp.data_devolucao + 'T00:00:00').toLocaleDateString('pt-BR');
        const dataReal = emp.data_devolucao_real ? new Date(emp.data_devolucao_real + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        
        // Se achar o perfil na tabela, usa ele. Se não, usa o nome que foi salvo no empréstimo. Se não tiver nenhum, usa 'Aluno Desconhecido'.
const nomeAluno = emp.perfis?.nome || emp.nome_aluno || 'Aluno Desconhecido';
        const tituloLivro = emp.livros ? emp.livros.titulo : 'Livro Excluído';

        let statusHtml = '';
        let linhaClasse = '';

        if (emp.devolvido) {
            // Se já foi devolvido, verifica se houve atraso na entrega
            const dataDev = new Date(emp.data_devolucao + 'T00:00:00');
            const dataRealObj = new Date(emp.data_devolucao_real + 'T00:00:00');
            
            if (dataRealObj > dataDev) {
                statusHtml = `<span class="status-emprestado" style="background:#FEE2E2; color:#991B1B;">Devolvido c/ Atraso</span>`;
            } else {
                statusHtml = `<span class="status-disponivel">Devolvido</span>`;
            }
        } else {
            // Se não foi devolvido, verifica se está atrasado hoje
            const dataDev = new Date(emp.data_devolucao + 'T00:00:00');
            if (dataDev < hoje) {
                statusHtml = `<span class="status-atraso">Atrasado</span>`;
                linhaClasse = 'linha-atraso';
            } else {
                statusHtml = `<span class="status-emprestado">Em andamento</span>`;
            }
        }

        tbody.innerHTML += `
            <tr class="${linhaClasse}">
                <td>${tituloLivro}</td>
                <td>${nomeAluno}</td>
                <td>${dataEmp}</td>
                <td>${dataPrev}</td>
                <td>${dataReal}</td>
                <td>${statusHtml}</td>
            </tr>
        `;
    });
}