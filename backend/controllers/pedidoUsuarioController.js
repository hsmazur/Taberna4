// controllers/pedidoUsuarioController.js
const db = require('../database');

/**
 * Buscar pedidos de um usuário específico
 */
const buscarPedidosUsuario = async (req, res) => {
    try {
        const { id } = req.params; // ID do usuário vindo da URL
        
        // Também aceita do header para validação adicional
        const usuarioIdHeader = obterUsuarioId(req);
        
        // Valida se o usuário está tentando acessar seus próprios pedidos
        if (usuarioIdHeader && usuarioIdHeader != id) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você só pode visualizar seus próprios pedidos'
            });
        }

        console.log('Buscando pedidos do usuário ID:', id);

        // Busca os pedidos do usuário
        const result = await db.query(`
            SELECT 
                p.id_pedido as id,
                p.id_usuario,
                p.data_pedido,
                p.pagamento,
                p.valor_total,
                u.nome_completo as nome_usuario,
                json_agg(
                    json_build_object(
                        'id_produto', pp.id_produto,
                        'nome_produto', prod.nome_produto,
                        'quantidade', pp.quantidade,
                        'preco_unitario', pp.preco_unitario
                    )
                ) as produtos
            FROM pedido p
            INNER JOIN usuario u ON p.id_usuario = u.id_usuario
            LEFT JOIN pedido_produto pp ON p.id_pedido = pp.id_pedido
            LEFT JOIN produto prod ON pp.id_produto = prod.id_produto
            WHERE p.id_usuario = $1 AND p.pagamento != 'Pendente'
            GROUP BY p.id_pedido, u.nome_completo
            ORDER BY p.data_pedido DESC
        `, [id]);

        // Formata os pedidos
        const pedidos = result.rows.map(pedido => ({
            id: pedido.id,
            id_usuario: pedido.id_usuario,
            nome_usuario: pedido.nome_usuario,
            data_pedido: pedido.data_pedido,
            pagamento: pedido.pagamento,
            valor_total: pedido.valor_total,
            produtos: pedido.produtos || []
        }));

        console.log(`Encontrados ${pedidos.length} pedidos para o usuário ${id}`);

        res.json(pedidos);

    } catch (error) {
        console.error('Erro ao buscar pedidos do usuário:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao buscar pedidos'
        });
    }
};

/**
 * Buscar detalhes de um pedido específico do usuário
 */
const buscarDetalhePedidoUsuario = async (req, res) => {
    try {
        const { pedidoId } = req.params;
        const usuarioId = obterUsuarioId(req);

        if (!usuarioId) {
            return res.status(401).json({
                error: 'Usuário não autenticado',
                message: 'É necessário estar logado'
            });
        }

        // Busca o pedido e verifica se pertence ao usuário
        const result = await db.query(`
            SELECT 
                p.id_pedido as id,
                p.id_usuario,
                p.data_pedido,
                p.pagamento,
                p.valor_total,
                u.nome_completo as nome_usuario,
                u.email as email_usuario,
                json_agg(
                    json_build_object(
                        'id_produto', pp.id_produto,
                        'nome_produto', prod.nome_produto,
                        'descricao', prod.descricao,
                        'quantidade', pp.quantidade,
                        'preco_unitario', pp.preco_unitario
                    )
                ) as produtos
            FROM pedido p
            INNER JOIN usuario u ON p.id_usuario = u.id_usuario
            LEFT JOIN pedido_produto pp ON p.id_pedido = pp.id_pedido
            LEFT JOIN produto prod ON pp.id_produto = prod.id_produto
            WHERE p.id_pedido = $1 AND p.id_usuario = $2
            GROUP BY p.id_pedido, u.nome_completo, u.email
        `, [pedidoId, usuarioId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Pedido não encontrado',
                message: 'Este pedido não existe ou não pertence a você'
            });
        }

        const pedido = result.rows[0];

        res.json({
            id: pedido.id,
            id_usuario: pedido.id_usuario,
            nome_usuario: pedido.nome_usuario,
            email_usuario: pedido.email_usuario,
            data_pedido: pedido.data_pedido,
            pagamento: pedido.pagamento,
            valor_total: pedido.valor_total,
            produtos: pedido.produtos || []
        });

    } catch (error) {
        console.error('Erro ao buscar detalhe do pedido:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao buscar detalhes do pedido'
        });
    }
};

/**
 * Obter estatísticas dos pedidos do usuário
 */
const obterEstatisticasUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioIdHeader = obterUsuarioId(req);

        // Valida se o usuário está acessando suas próprias estatísticas
        if (usuarioIdHeader && usuarioIdHeader != id) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você só pode visualizar suas próprias estatísticas'
            });
        }

        // Busca estatísticas
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_pedidos,
                COUNT(CASE WHEN pagamento = 'Aprovado' THEN 1 END) as pedidos_aprovados,
                COUNT(CASE WHEN pagamento = 'Pendente' THEN 1 END) as pedidos_pendentes,
                COUNT(CASE WHEN pagamento = 'Cancelado' THEN 1 END) as pedidos_cancelados,
                COALESCE(SUM(CASE WHEN pagamento = 'Aprovado' THEN valor_total ELSE 0 END), 0) as total_gasto
            FROM pedido
            WHERE id_usuario = $1
        `, [id]);

        const stats = result.rows[0];

        res.json({
            total_pedidos: parseInt(stats.total_pedidos),
            pedidos_aprovados: parseInt(stats.pedidos_aprovados),
            pedidos_pendentes: parseInt(stats.pedidos_pendentes),
            pedidos_cancelados: parseInt(stats.pedidos_cancelados),
            total_gasto: parseFloat(stats.total_gasto)
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao obter estatísticas'
        });
    }
};

/**
 * Função auxiliar para obter o ID do usuário
 */
function obterUsuarioId(req) {
    // Tenta obter do header
    if (req.headers['x-usuario-id']) {
        const id = parseInt(req.headers['x-usuario-id']);
        if (!isNaN(id)) {
            return id;
        }
    }

    // Tenta obter do cookie
    if (req.cookies && req.cookies.usuario) {
        try {
            const usuario = JSON.parse(req.cookies.usuario);
            if (usuario && usuario.id) {
                return usuario.id;
            }
        } catch (e) {
            console.error('Erro ao parsear cookie:', e);
        }
    }

    return null;
}

module.exports = {
    buscarPedidosUsuario,
    buscarDetalhePedidoUsuario,
    obterEstatisticasUsuario
};