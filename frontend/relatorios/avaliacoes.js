// frontend/relatorios/avaliacoes.js
const API_URL = 'http://localhost:3001/api/relatorios';

// Estado global
let dadosRelatorio = null;

// ========================
// INICIALIZAÇÃO
// ========================
document.addEventListener('DOMContentLoaded', () => {
    // Define ano atual como padrão
    const anoAtual = new Date().getFullYear();
    document.getElementById('ano').value = anoAtual;
    
    // Configura eventos dos botões
    document.getElementById('btnFiltrar').addEventListener('click', carregarRelatorio);
    document.getElementById('btnLimpar').addEventListener('click', limparFiltros);
    document.getElementById('btnImprimir').addEventListener('click', imprimirRelatorio);
    
    // Carrega relatório inicial (ano atual)
    carregarRelatorio();
});

// ========================
// FUNÇÕES PRINCIPAIS
// ========================

/**
 * Carrega dados do relatório da API
 */
async function carregarRelatorio() {
    try {
        mostrarLoading(true);
        
        const mes = document.getElementById('mes').value;
        const ano = document.getElementById('ano').value;
        
        // Monta URL com parâmetros
        let url = `${API_URL}/avaliacoes?`;
        if (mes) url += `mes=${mes}&`;
        if (ano) url += `ano=${ano}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        dadosRelatorio = await response.json();
        
        // Renderiza o relatório
        renderizarRelatorio(dadosRelatorio);
        
        mostrarLoading(false);
        
    } catch (error) {
        console.error('Erro ao carregar relatório:', error);
        mostrarErro(`Erro ao carregar relatório: ${error.message}`);
        mostrarLoading(false);
    }
}

/**
 * Renderiza todos os dados do relatório
 */
function renderizarRelatorio(dados) {
    // Atualiza período na impressão
    atualizarPeriodoImpressao(dados.periodo);
    
    // Renderiza cards de resumo
    renderizarResumo(dados.resumo);
    
    // Renderiza produtos mais bem avaliados
    renderizarMelhoresAvaliados(dados.produtosMelhoresAvaliados);
    
    // Renderiza produtos mais avaliados
    renderizarMaisAvaliados(dados.produtosMaisAvaliados);
    
    // Renderiza distribuição de notas
    renderizarDistribuicaoNotas(dados.distribuicaoNotas, dados.resumo.total_avaliacoes);
    
    // Mostra conteúdo
    document.getElementById('conteudo-relatorio').style.display = 'block';
    document.getElementById('erro-relatorio').style.display = 'none';
}

/**
 * Renderiza cards de resumo
 */
function renderizarResumo(resumo) {
    document.getElementById('total-avaliacoes').textContent = 
        resumo.total_avaliacoes || 0;
    
    document.getElementById('nota-media-geral').textContent = 
        parseFloat(resumo.nota_media_geral || 0).toFixed(1);
    
    document.getElementById('usuarios-avaliaram').textContent = 
        resumo.usuarios_avaliaram || 0;
    
    document.getElementById('produtos-avaliados').textContent = 
        resumo.produtos_avaliados || 0;
}

/**
 * Renderiza tabela de produtos mais bem avaliados
 */
function renderizarMelhoresAvaliados(produtos) {
    const tbody = document.getElementById('tabela-melhores');
    
    if (!produtos || produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum produto avaliado no período</td></tr>';
        return;
    }
    
    tbody.innerHTML = produtos.map((produto, index) => {
        const classeNota = obterClasseNota(produto.nota_media);
        return `
        <tr>
            <td class="${index < 3 ? 'posicao-destaque' : ''}">${index + 1}º</td>
            <td>${produto.nome_produto}</td>
            <td class="texto-centro ${classeNota}">${parseFloat(produto.nota_media).toFixed(1)}</td>
            <td class="texto-direita">${produto.total_avaliacoes}</td>
            <td class="texto-centro nota-alta">${produto.melhor_nota}</td>
            <td class="texto-centro nota-baixa">${produto.pior_nota}</td>
        </tr>
        `;
    }).join('');
}

/**
 * Renderiza tabela de produtos mais avaliados
 */
function renderizarMaisAvaliados(produtos) {
    const tbody = document.getElementById('tabela-mais-avaliados');
    
    if (!produtos || produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum produto avaliado no período</td></tr>';
        return;
    }
    
    tbody.innerHTML = produtos.map((produto, index) => {
        const classeNota = obterClasseNota(produto.nota_media);
        return `
        <tr>
            <td class="${index < 3 ? 'posicao-destaque' : ''}">${index + 1}º</td>
            <td>${produto.nome_produto}</td>
            <td class="texto-direita">${produto.total_avaliacoes}</td>
            <td class="texto-centro ${classeNota}">${parseFloat(produto.nota_media).toFixed(1)}</td>
        </tr>
        `;
    }).join('');
}

/**
 * Renderiza tabela de distribuição de notas
 */
function renderizarDistribuicaoNotas(distribuicao, totalAvaliacoes) {
    const tbody = document.getElementById('tabela-distribuicao');
    
    if (!distribuicao || distribuicao.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhuma avaliação no período</td></tr>';
        return;
    }
    
    // Preenche todas as notas de 1 a 5
    let html = '';
    for (let nota = 5; nota >= 1; nota--) {
        const item = distribuicao.find(d => parseInt(d.nota) === nota);
        const quantidade = item ? parseInt(item.quantidade) : 0;
        const porcentagem = totalAvaliacoes > 0 ? ((quantidade / totalAvaliacoes) * 100).toFixed(1) : '0.0';
        const classeNota = obterClasseNota(nota);
        
        html += `
        <tr>
            <td class="texto-centro ${classeNota}">${nota} ★</td>
            <td class="texto-direita">${quantidade}</td>
            <td class="texto-direita">${porcentagem}%</td>
        </tr>
        `;
    }
    
    tbody.innerHTML = html;
}

// ========================
// FUNÇÕES AUXILIARES
// ========================

/**
 * Obtém classe CSS baseada na nota
 */
function obterClasseNota(nota) {
    if (nota >= 4.5) return 'nota-alta';
    if (nota >= 3.5) return 'nota-media';
    return 'nota-baixa';
}

/**
 * Atualiza informações de período para impressão
 */
function atualizarPeriodoImpressao(periodo) {
    const mesNome = obterNomeMes(periodo.mes);
    const ano = periodo.ano;
    
    let textoPeriodo = '';
    if (mesNome && mesNome !== 'Todos' && ano && ano !== 'Todos') {
        textoPeriodo = `Período: ${mesNome}/${ano}`;
    } else if (ano && ano !== 'Todos') {
        textoPeriodo = `Período: Ano de ${ano}`;
    } else {
        textoPeriodo = 'Período: Todos os registros';
    }
    
    document.getElementById('periodo-impressao').textContent = textoPeriodo;
    document.getElementById('data-geracao').textContent = 
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
}

/**
 * Obtém nome do mês
 */
function obterNomeMes(mesNumero) {
    if (!mesNumero || mesNumero === 'Todos') return 'Todos';
    
    const meses = [
        '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return meses[parseInt(mesNumero)] || '';
}

/**
 * Limpa filtros e recarrega
 */
function limparFiltros() {
    document.getElementById('mes').value = '';
    document.getElementById('ano').value = new Date().getFullYear();
    carregarRelatorio();
}

/**
 * Imprime o relatório
 */
function imprimirRelatorio() {
    window.print();
}

/**
 * Mostra/oculta loading
 */
function mostrarLoading(mostrar) {
    document.getElementById('loading').style.display = mostrar ? 'block' : 'none';
    document.getElementById('conteudo-relatorio').style.display = mostrar ? 'none' : 'block';
}

/**
 * Mostra mensagem de erro
 */
function mostrarErro(mensagem) {
    document.getElementById('erro-relatorio').style.display = 'block';
    document.getElementById('mensagem-erro').textContent = mensagem;
    document.getElementById('conteudo-relatorio').style.display = 'none';
}