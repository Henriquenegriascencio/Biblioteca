// Variáveis globais
let usuarioAtual = null;
let tipoUsuario = 'aluno';

// ==========================================
// 1. INICIALIZAÇÃO E PROTEÇÃO DE ROTA
// ==========================================
async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    // Se não estiver logado, vai pro login
    if (!session) return window.location.href = 'index.html';

    // Busca o perfil do usuário logado
    const { data: perfil, error } = await window.supabaseClient
        .from('perfis')
        .select('*')
        .eq('id', session.user.id)
        .single();

    // Se for aluno, não pode ficar aqui
    if (error || !perfil || perfil.tipo_usuario === 'aluno') {
        return window.location.href = 'aluno.html';
    }

    // Configura os dados do usuário
    usuarioAtual = session.user;
    tipoUsuario = perfil.tipo_usuario;
    document.getElementById('user-nome').innerText = perfil.nome || 'Usuário';

    // Configura a tela dependendo do cargo
    if (tipoUsuario === 'administrador') {
        const optBibliotecario = document.getElementById('opt-bibliotecario');
        if (optBibliotecario) optBibliotecario.style.display = 'block';
        document.querySelector('.header h1').innerText = '👑 Painel do Administrador';
    } else {
        const optBibliotecario = document.getElementById('opt-bibliotecario');
        if (optBibliotecario) optBibliotecario.style.display = 'none';
        document.querySelector('.header h1').innerText = '📚 Painel do Bibliotecário';
    }

    // Carrega os dados iniciais
    carregarLivros();
    carregarAlunos();
    carregarEmprestimos();
}
init();

// ==========================================
// 2. CONTROLE DE ABAS
// ==========================================
function mudarAba(aba) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const abaAlvo = document.getElementById(`aba-${aba}`);
    if (abaAlvo) abaAlvo.classList.add('active');
    
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    // Atualiza os dados ao entrar na aba
    if (aba === 'livros') carregarLivros();
    if (aba === 'emprestimos') carregarEmprestimos();
    if (aba === 'relatorios') carregarRelatorios(); 
}

// ==========================================
// 3. FUNÇÕES DE LIVROS
// ==========================================
async function carregarLivros() {
    const { data: livros, error } = await window.supabaseClient.from('livros').select('*').order('id', { ascending: false });
    if (error) return console.error("Erro ao carregar livros:", error);

    const tbody = document.querySelector('#tabela-livros tbody');
    const selectLivro = document.getElementById('select-livro');
    
    if (tbody) tbody.innerHTML = '';
    if (selectLivro) selectLivro.innerHTML = '<option value="">Selecione um livro disponível...</option>';
    
    const totalLivrosEl = document.getElementById('total-livros');
    if (totalLivrosEl) totalLivrosEl.innerText = livros.length;

    (livros || []).forEach(livro => {
        if (tbody) {
            tbody.innerHTML += `
                <tr>
                    <td>${livro.titulo}</td>
                    <td>${livro.autor}</td>
                    <td>${livro.categoria || 'Geral'}</td>
                    <td><span class="${livro.disponivel ? 'status-disponivel' : 'status-emprestado'}">${livro.disponivel ? 'Disponível' : 'Emprestado'}</span></td>
                </tr>
            `;
        }
        if (livro.disponivel && selectLivro) {
            selectLivro.innerHTML += `<option value="${livro.id}">${livro.titulo}</option>`;
        }
    });
}

document.getElementById('form-livro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('titulo')?.value.trim();
    const autor = document.getElementById('autor')?.value.trim();
    const categoria = document.getElementById('categoria')?.value;

    const { error } = await window.supabaseClient.from('livros').insert([{ titulo, autor, categoria }]);
    if (error) return alert("Erro ao cadastrar livro: " + error.message);

    document.getElementById('form-livro').reset();
    carregarLivros();
    alert("Livro cadastrado com sucesso!");
});

// ==========================================
// 4. FUNÇÕES DE USUÁRIOS (CADASTRO)
// ==========================================
async function carregarAlunos() {
    const { data: alunos, error } = await window.supabaseClient
        .from('perfis')
        .select('*')
        .eq('tipo_usuario', 'aluno')
        .order('nome');

    if (error) return console.error("Erro ao carregar alunos:", error);

    const select = document.getElementById('select-aluno');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione o Aluno...</option>';
    (alunos || []).forEach(a => {
        const nomeSeguro = a.nome || 'Aluno sem nome';
        const turmaTexto = a.turma ? ` - ${a.turma}` : '';
        const matTexto = a.matricula ? ` - Mat: ${a.matricula}` : '';
        select.innerHTML += `<option value="${a.id}">${nomeSeguro}${turmaTexto}${matTexto}</option>`;
    });
}

function alternarCamposUsuario() {
    const tipo = document.getElementById('user-tipo')?.value;
    const campos = document.getElementById('campos-aluno-user');
    const inputTurma = document.getElementById('user-turma');
    const inputMatricula = document.getElementById('user-matricula');

    if (!campos) return;

    if (tipo === 'aluno') {
        campos.style.display = 'block';
        if (inputTurma) inputTurma.required = true;
        if (inputMatricula) inputMatricula.required = true;
    } else {
        campos.style.display = 'none';
        if (inputTurma) { inputTurma.required = false; inputTurma.value = ''; }
        if (inputMatricula) { inputMatricula.required = false; inputMatricula.value = ''; }
    }
}

document.getElementById('form-usuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Pega os valores dos campos
    const nome = document.getElementById('user-nome')?.value.trim();
    const email = document.getElementById('user-email')?.value.trim();
    const senha = document.getElementById('user-senha')?.value;
    const tipoConta = document.getElementById('user-tipo')?.value;
    const turma = document.getElementById('user-turma')?.value || '';
    const matricula = document.getElementById('user-matricula')?.value || '';

    // Validações básicas
    if (!nome || !email || !senha) {
        return alert("Por favor, preencha Nome, E-mail e Senha.");
    }
    if (senha.length < 6) {
        return alert("A senha precisa ter pelo menos 6 caracteres.");
    }

    // Cria um cliente temporário para não deslogar o Admin atual
    const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Cria o usuário no Authentication
    const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: email,
        password: senha,
        options: { data: { nome, tipo_usuario: tipoConta, turma, matricula } }
    });

    if (authError) {
        return alert("Erro ao criar login: " + authError.message);
    }

    // 2. Força a gravação na tabela PERFIS (A garantia que você quer)
    if (authData && authData.user) {
        const { error: perfilError } = await window.supabaseClient
            .from('perfis')
            .upsert([{
                id: authData.user.id,
                nome: nome,
                tipo_usuario: tipoConta,
                turma: turma,
                matricula: matricula
            }]);

        if (perfilError) {
            console.error("Erro no perfil:", perfilError);
            alert("Login criado, mas erro ao salvar na tabela de perfis: " + perfilError.message);
            return;
        }

        // Se chegou aqui, deu tudo certo!
        alert(`Conta de ${nome} criada com sucesso e salva no sistema!`);
        document.getElementById('form-usuario').reset();
        alternarCamposUsuario(); 
        
        if (tipoConta === 'aluno') carregarAlunos(); 
    } else {
        alert("O Supabase não retornou os dados do usuário. Verifique se este e-mail já está em uso no sistema.");
    }
});

// ==========================================
// 5. FUNÇÕES DE EMPRÉSTIMOS E DEVOLUÇÕES
// ==========================================
async function carregarEmprestimos() {
    const { data: emprestimos, error } = await window.supabaseClient
        .from('emprestimos')
        .select(`*, livros (titulo), perfis (nome)`)
        .eq('devolvido', false);

    if (error) return console.error("Erro ao carregar empréstimos:", error);

    const tbody = document.querySelector('#tabela-emprestimos tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const lista = emprestimos || [];
    
    let contadorAtrasados = 0;
    const totalEmpEl = document.getElementById('total-emprestados');
    if (totalEmpEl) totalEmpEl.innerText = lista.length;

    const hoje = new Date(); 
    hoje.setHours(0, 0, 0, 0);

    lista.forEach(emp => {
        const dataDev = new Date(emp.data_devolucao + 'T00:00:00');
        const dataFormatada = dataDev.toLocaleDateString('pt-BR');
        
        let statusHtml = '<span class="status-disponivel">Em dia</span>';
        let linhaClasse = '';
        let btnAcoes = `<button class="btn-devolver" onclick="devolverLivro(${emp.id}, ${emp.livro_id})">Devolver</button>`;

        if (dataDev < hoje) {
            statusHtml = `<span class="status-atraso">Atrasado</span>`;
            linhaClasse = 'linha-atraso';
            contadorAtrasados++;
        } else {
            btnAcoes += `<button class="btn-renovar" onclick="renovarEmprestimo(${emp.id}, '${emp.data_devolucao}')">+7 Dias</button>`;
        }

        // Proteção para pegar o nome do aluno
        const nomeAluno = emp.perfis?.nome || emp.nome_aluno || 'Aluno Desconhecido';
        const tituloLivro = emp.livros?.titulo || 'Livro Excluído';

        tbody.innerHTML += `
            <tr class="${linhaClasse}">
                <td>${tituloLivro}</td>
                <td>${nomeAluno}</td>
                <td>${dataFormatada}</td>
                <td>${statusHtml}</td>
                <td>${btnAcoes}</td>
            </tr>
        `;
    });

    const totalAtrasadosEl = document.getElementById('total-atrasados');
    if (totalAtrasadosEl) totalAtrasadosEl.innerText = contadorAtrasados;
}

document.getElementById('form-emprestimo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectLivro = document.getElementById('select-livro');
    const selectAluno = document.getElementById('select-aluno');
    
    if (!selectLivro || !selectAluno) return;

    const livro_id = selectLivro.value;
    const aluno_id = selectAluno.value;
    const data_devolucao = document.getElementById('data-devolucao')?.value;

    if (!livro_id || !aluno_id || !data_devolucao) {
        return alert("Por favor, selecione o livro, o aluno e a data!");
    }

    const nome_aluno = selectAluno.options[selectAluno.selectedIndex].text;

    const { error: erroEmprestimo } = await window.supabaseClient
        .from('emprestimos')
        .insert([{ livro_id, aluno_id, nome_aluno, data_devolucao }]);

    if (erroEmprestimo) return alert("Erro: " + erroEmprestimo.message);

    // Atualiza o livro para indisponível
    await window.supabaseClient.from('livros').update({ disponivel: false }).eq('id', livro_id);

    alert("Empréstimo registrado!");
    document.getElementById('form-emprestimo').reset();
    carregarEmprestimos();
    carregarLivros(); 
});

async function devolverLivro(emprestimo_id, livro_id) {
    if(!confirm("Confirmar devolução do livro?")) return;
    
    // Pega a data de hoje no formato AAAA-MM-DD
    const hoje = new Date().toISOString().split('T')[0];

    await window.supabaseClient.from('emprestimos')
        .update({ devolvido: true, data_devolucao_real: hoje })
        .eq('id', emprestimo_id);
        
    await window.supabaseClient.from('livros').update({ disponivel: true }).eq('id', livro_id);
    
    alert("Livro devolvido com sucesso!");
    carregarEmprestimos(); 
    carregarLivros();
    carregarRelatorios();
}

async function renovarEmprestimo(emprestimo_id, dataAtualString) {
    const dataAtual = new Date(dataAtualString + 'T00:00:00');
    dataAtual.setDate(dataAtual.getDate() + 7);
    const novaData = dataAtual.toISOString().split('T')[0];

    const { error } = await window.supabaseClient.from('emprestimos').update({ data_devolucao: novaData }).eq('id', emprestimo_id);
    
    if (!error) {
        alert("Empréstimo renovado por mais 7 dias!");
        carregarEmprestimos();
    }
}

// ==========================================
// 6. FUNÇÕES DE RELATÓRIOS
// ==========================================
async function carregarRelatorios() {
    const { data: historico, error } = await window.supabaseClient
        .from('emprestimos')
        .select(`*, livros (titulo), perfis (nome)`)
        .order('id', { ascending: false });

    if (error) return console.error("Erro ao carregar relatórios:", error);

    const tbody = document.querySelector('#tabela-relatorios tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const lista = historico || [];
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    lista.forEach(emp => {
        const dataEmp = new Date(emp.criado_em).toLocaleDateString('pt-BR');
        const dataPrev = new Date(emp.data_devolucao + 'T00:00:00').toLocaleDateString('pt-BR');
        const dataReal = emp.data_devolucao_real ? new Date(emp.data_devolucao_real + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        
        const nomeAluno = emp.perfis?.nome || emp.nome_aluno || 'Aluno Desconhecido';
        const tituloLivro = emp.livros?.titulo || 'Livro Excluído';

        let statusHtml = '';
        let linhaClasse = '';

        if (emp.devolvido) {
            const dataDev = new Date(emp.data_devolucao + 'T00:00:00');
            const dataRealObj = new Date(emp.data_devolucao_real + 'T00:00:00');
            
            if (dataRealObj > dataDev) {
                statusHtml = `<span class="status-emprestado" style="background:#FEE2E2; color:#991B1B;">Dev. c/ Atraso</span>`;
            } else {
                statusHtml = `<span class="status-disponivel">Devolvido</span>`;
            }
        } else {
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