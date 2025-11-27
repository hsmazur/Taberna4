// frontend/relatorios/vendas.js
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
        let url = `${API_URL}/vendas?`;
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
    
    // Renderiza produtos mais vendidos
    renderizarProdutos(dados.produtosMaisVendidos);
    
    // Renderiza top clientes
    renderizarClientes(dados.topClientes);
    
    // Mostra conteúdo
    document.getElementById('conteudo-relatorio').style.display = 'block';
    document.getElementById('erro-relatorio').style.display = 'none';
}

/**
 * Renderiza cards de resumo
 */
function renderizarResumo(resumo) {
    document.getElementById('receita-total').textContent = 
        `R$ ${parseFloat(resumo.receita_total).toFixed(2)}`;
    
    document.getElementById('total-pedidos').textContent = 
        resumo.total_pedidos;
    
    document.getElementById('clientes-unicos').textContent = 
        resumo.clientes_unicos;
}

/**
 * Renderiza tabela de produtos mais vendidos
 */
function renderizarProdutos(produtos) {
    const tbody = document.getElementById('tabela-produtos');
    
    if (!produtos || produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum produto vendido no período</td></tr>';
        return;
    }
    
    tbody.innerHTML = produtos.map((produto, index) => `
        <tr>
            <td class="${index < 3 ? 'posicao-destaque' : ''}">${index + 1}º</td>
            <td>${produto.nome_produto}</td>
            <td class="texto-direita">${produto.quantidade_vendida}</td>
            <td class="texto-direita">R$ ${parseFloat(produto.receita_produto).toFixed(2)}</td>
            <td class="texto-direita">${produto.num_pedidos}</td>
        </tr>
    `).join('');
}

/**
 * Renderiza tabela de top clientes
 */
function renderizarClientes(clientes) {
    const tbody = document.getElementById('tabela-clientes');
    
    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum cliente no período</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map((cliente, index) => `
        <tr>
            <td class="${index < 3 ? 'posicao-destaque' : ''}">${index + 1}º</td>
            <td>${cliente.nome_completo}</td>
            <td class="texto-direita">${cliente.total_pedidos}</td>
            <td class="texto-direita">R$ ${parseFloat(cliente.total_gasto).toFixed(2)}</td>
        </tr>
    `).join('');
}

// ========================
// FUNÇÕES AUXILIARES
// ========================

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