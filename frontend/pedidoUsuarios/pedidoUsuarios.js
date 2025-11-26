// pedidoUsuarios.js
const API_BASE_URL = 'http://localhost:3001';

let usuarioLogado = null;
let todosPedidos = [];
let filtroAtivo = 'todos';

// ========================
// INICIALIZAÇÃO
// ========================
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está logado
    if (!verificarUsuarioLogado()) {
        alert('Você precisa estar logado para ver seus pedidos!');
        window.location.href = '../login/login.html?redirect=../pedidoUsuarios/pedidoUsuarios';
        return;
    }

    // Mostra informações do usuário
    document.getElementById('info-usuario').textContent = `Bem-vindo, ${usuarioLogado.nome}!`;

    // Carrega os pedidos
    await carregarPedidos();

    // Configura os filtros
    configurarFiltros();
});

// ========================
// AUTENTICAÇÃO
// ========================

/**
 * Verifica se o usuário está logado
 */
function verificarUsuarioLogado() {
    // Tenta pelo localStorage
    const usuarioLocal = localStorage.getItem('usuario');
    if (usuarioLocal) {
        try {
            usuarioLogado = JSON.parse(usuarioLocal);
            return true;
        } catch (e) {
            console.error('Erro ao parsear usuário:', e);
        }
    }

    // Tenta pelo cookie
    const usuarioCookie = getCookie('usuario');
    if (usuarioCookie) {
        try {
            usuarioLogado = JSON.parse(usuarioCookie);
            localStorage.setItem('usuario', usuarioCookie);
            return true;
        } catch (e) {
            console.error('Erro ao parsear cookie:', e);
        }
    }

    return false;
}

/**
 * Função auxiliar para ler cookies
 */
function getCookie(nome) {
    const nomeIgual = nome + "=";
    const cookies = document.cookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(nomeIgual) === 0) {
            return cookie.substring(nomeIgual.length, cookie.length);
        }
    }
    return null;
}

// ========================
// CARREGAMENTO DE DADOS
// ========================

/**
 * Carrega os pedidos do usuário logado
 */
async function carregarPedidos() {
    try {
        mostrarLoading();

        const response = await fetch(`${API_BASE_URL}/api/pedidos/usuario/${usuarioLogado.id}`, {
            headers: {
                'X-Usuario-ID': usuarioLogado.id.toString()
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar pedidos');
        }

        todosPedidos = await response.json();
        
        if (todosPedidos.length === 0) {
            mostrarMensagemVazio();
        } else {
            exibirPedidos(todosPedidos);
        }

    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        mostrarErro('Não foi possível carregar seus pedidos. Tente novamente mais tarde.');
    }
}

// ========================
// EXIBIÇÃO DOS PEDIDOS
// ========================

/**
 * Exibe os pedidos na tela
 */
function exibirPedidos(pedidos) {
    const listaPedidos = document.getElementById('lista-pedidos');
    
    if (pedidos.length === 0) {
        mostrarMensagemVazio();
        return;
    }

    let html = '';
    
    pedidos.forEach(pedido => {
        const dataFormatada = new Date(pedido.data_pedido).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        html += `
            <div class="pedido-card">
                <div class="pedido-header">
                    <div>
                        <div class="pedido-id">Pedido #${pedido.id}</div>
                        <div class="pedido-data">📅 ${dataFormatada}</div>
                    </div>
                    <span class="status-badge status-${pedido.pagamento.toLowerCase()}">
                        ${pedido.pagamento}
                    </span>
                </div>

                <div class="pedido-info">
                    <div class="info-item">
                        <div class="info-label">Método de Pagamento</div>
                        <div class="info-valor">${formatarMetodoPagamento(pedido.pagamento)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Quantidade de Itens</div>
                        <div class="info-valor">${pedido.produtos.length}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Valor Total</div>
                        <div class="info-valor destaque">R$ ${parseFloat(pedido.valor_total).toFixed(2)}</div>
                    </div>
                </div>

                <div class="pedido-produtos">
                    <h4>🍔 Produtos do Pedido:</h4>
                    <div class="produtos-grid">
                        ${renderizarProdutos(pedido.produtos)}
                    </div>
                </div>
            </div>
        `;
    });

    listaPedidos.innerHTML = html;
}

/**
 * Renderiza os produtos de um pedido
 */
function renderizarProdutos(produtos) {
    if (!produtos || produtos.length === 0) {
        return '<p>Nenhum produto encontrado</p>';
    }

    return produtos.map(produto => `
        <div class="produto-card">
            <img src="../img/lanche${produto.id_produto}.png" 
                 alt="${produto.nome_produto || 'Produto'}"
                 onerror="this.src='../img/placeholder.png'">
            <div class="produto-nome">${produto.nome_produto || 'Produto não encontrado'}</div>
            <div class="produto-quantidade">Quantidade: ${produto.quantidade}x</div>
            <div class="produto-preco">R$ ${(parseFloat(produto.preco_unitario) * parseInt(produto.quantidade)).toFixed(2)}</div>
        </div>
    `).join('');
}

// ========================
// FILTROS
// ========================

/**
 * Configura os botões de filtro
 */
function configurarFiltros() {
    const botoesFiltro = document.querySelectorAll('.btn-filtro');
    
    botoesFiltro.forEach(botao => {
        botao.addEventListener('click', () => {
            // Remove classe ativo de todos
            botoesFiltro.forEach(b => b.classList.remove('ativo'));
            
            // Adiciona classe ativo no clicado
            botao.classList.add('ativo');
            
            // Aplica o filtro
            filtroAtivo = botao.getAttribute('data-filtro');
            aplicarFiltro(filtroAtivo);
        });
    });
}

/**
 * Aplica o filtro selecionado
 */
function aplicarFiltro(filtro) {
    let pedidosFiltrados = todosPedidos;

    if (filtro !== 'todos') {
        pedidosFiltrados = todosPedidos.filter(pedido => 
            pedido.pagamento === filtro
        );
    }

    if (pedidosFiltrados.length === 0) {
        mostrarMensagemFiltroVazio(filtro);
    } else {
        exibirPedidos(pedidosFiltrados);
    }
}

// ========================
// FUNÇÕES AUXILIARES
// ========================

/**
 * Formata o método de pagamento
 */
function formatarMetodoPagamento(metodo) {
    const metodos = {
        'dinheiro': '💵 Dinheiro',
        'pix': '📱 PIX',
        'debito': '💳 Débito',
        'Pendente': '⏳ Pendente',
        'Aprovado': '✅ Aprovado',
        'Cancelado': '❌ Cancelado',
        'Reembolsado': '↩️ Reembolsado'
    };
    
    return metodos[metodo] || metodo;
}

/**
 * Mostra estado de loading
 */
function mostrarLoading() {
    const listaPedidos = document.getElementById('lista-pedidos');
    listaPedidos.innerHTML = `
        <div class="loading">
            <p>🍖 Carregando seus pedidos...</p>
        </div>
    `;
}

/**
 * Mostra mensagem quando não há pedidos
 */
function mostrarMensagemVazio() {
    const listaPedidos = document.getElementById('lista-pedidos');
    listaPedidos.style.display = 'none';
    
    const mensagemVazio = document.getElementById('mensagem-vazio');
    mensagemVazio.style.display = 'block';
}

/**
 * Mostra mensagem quando filtro não retorna resultados
 */
function mostrarMensagemFiltroVazio(filtro) {
    const listaPedidos = document.getElementById('lista-pedidos');
    listaPedidos.innerHTML = `
        <div class="mensagem-vazio" style="display: block;">
            <img src="https://cdn-icons-png.flaticon.com/128/4076/4076549.png" alt="Nenhum resultado">
            <h3>Nenhum pedido ${filtro === 'todos' ? '' : filtro.toLowerCase()} encontrado</h3>
            <p>Tente selecionar outro filtro</p>
        </div>
    `;
}

/**
 * Mostra mensagem de erro
 */
function mostrarErro(mensagem) {
    const listaPedidos = document.getElementById('lista-pedidos');
    listaPedidos.innerHTML = `
        <div class="erro-message">
            <h3>❌ Erro ao carregar pedidos</h3>
            <p>${mensagem}</p>
            <button onclick="location.reload()" class="btn-voltar">Tentar novamente</button>
        </div>
    `;
}