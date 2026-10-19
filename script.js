// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://sysghgyhotgobvbvzjju.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_YoavoW5o3SuMdp-b5Apmhg_GpPEit0O';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONTROLE DE ABAS ---
function mudarAba(aba) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`aba-${aba}`).classList.add('active');
    event.target.classList.add('active');

    if (aba === 'livros') carregarLivros();
    if (aba === 'emprestimos') carregarEmprestimos();
}

// --- 1. FUNÇÕES DE LIVROS ---
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
        const categoria = livro.categoria || 'Geral';

        tbody.innerHTML += `
            <tr>
                <td>${livro.titulo}</td>
                <td>${livro.autor}</td>
                <td>${categoria}</td>
                <td class="${statusClasse}">${statusTexto}</td>
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

    if (error) {
        alert("Erro ao cadastrar: " + error.message);
    } else {
        document.getElementById('form-livro').reset();
        carregarLivros();
        alert("Livro cadastrado!");
    }
});

// --- 2. FUNÇÕES DE EMPRÉSTIMOS E ATRASOS ---
async function carregarEmprestimos() {
    const { data: emprestimos, error } = await supabaseClient
        .from('emprestimos')
        .select(`*, livros (titulo)`)
        .eq('devolvido', false);

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
        
        let statusHtml = '<span style="color: green;">Em dia</span>';
        let linhaClasse = '';
        let btnRenovarHtml = '';

        if (dataDev < hoje) {
            const diffTime = Math.abs(hoje - dataDev);
            const diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            statusHtml = `<span class="status-atraso">Atrasado (${diasAtraso} dias)</span>`;
            linhaClasse = 'linha-atraso';
            contadorAtrasados++;
        } else {
            btnRenovarHtml = `<button class="btn-renovar" onclick="renovarEmprestimo(${emp.id}, '${emp.data_devolucao}')">+7 Dias</button>`;
        }

        tbody.innerHTML += `
            <tr class="${linhaClasse}">
                <td>${emp.livros.titulo}</td>
                <td>${emp.nome_aluno}</td>
                <td>${dataFormatada}</td>
                <td>${statusHtml}</td>
                <td>
                    <button class="btn-devolver" onclick="devolverLivro(${emp.id}, ${emp.livro_id})">Devolver</button>
                    ${btnRenovarHtml}
                </td>
            </tr>
        `;
    });

    document.getElementById('total-atrasados').innerText = contadorAtrasados;
}

document.getElementById('form-emprestimo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const livro_id = document.getElementById('select-livro').value;
    const nome_aluno = document.getElementById('nome-aluno').value;
    const data_devolucao = document.getElementById('data-devolucao').value;

    if(!livro_id) return alert("Selecione um livro!");

    const { error: erroEmprestimo } = await supabaseClient
        .from('emprestimos')
        .insert([{ livro_id, nome_aluno, data_devolucao }]);

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

    const { error } = await supabaseClient
        .from('emprestimos')
        .update({ data_devolucao: novaData })
        .eq('id', emprestimo_id);

    if (error) {
        alert("Erro ao renovar: " + error.message);
    } else {
        alert("Empréstimo renovado por mais 7 dias!");
        carregarEmprestimos();
    }
}

// Inicializa a página
carregarLivros();
carregarEmprestimos(); 