// backend/controllers/relatorioVendasController.js
const { query } = require('../database');

class RelatorioVendasController {
    
    // ========================
    // RELATÓRIO DE VENDAS POR PERÍODO
    // ========================
    static async getRelatorioVendas(req, res) {
        try {
            const { mes, ano } = req.query;
            
            let whereClause = "WHERE p.pagamento = 'Aprovado'";
            let params = [];
            
            // Filtra por mês e ano se fornecido
            if (mes && ano) {
                whereClause += " AND EXTRACT(MONTH FROM p.data_pedido) = $1 AND EXTRACT(YEAR FROM p.data_pedido) = $2";
                params = [mes, ano];
            } else if (ano) {
                whereClause += " AND EXTRACT(YEAR FROM p.data_pedido) = $1";
                params = [ano];
            }
            
            // Resumo geral
            const resumoSql = `
                SELECT 
                    COUNT(DISTINCT p.id_pedido) as total_pedidos,
                    COALESCE(SUM(p.valor_total), 0) as receita_total,
                    COALESCE(AVG(p.valor_total), 0) as ticket_medio,
                    COUNT(DISTINCT p.id_usuario) as clientes_unicos
                FROM pedido p
                ${whereClause}
            `;
            
            const resumo = await query(resumoSql, params);
            
            // Produtos mais vendidos
            const produtosSql = `
                SELECT 
                    pr.id_produto,
                    pr.nome_produto,
                    SUM(pp.quantidade) as quantidade_vendida,
                    SUM(pp.quantidade * pp.preco_unitario) as receita_produto,
                    COUNT(DISTINCT pp.id_pedido) as num_pedidos
                FROM pedido p
                INNER JOIN pedido_produto pp ON p.id_pedido = pp.id_pedido
                INNER JOIN produto pr ON pp.id_produto = pr.id_produto
                ${whereClause}
                GROUP BY pr.id_produto, pr.nome_produto
                ORDER BY quantidade_vendida DESC
                LIMIT 10
            `;
            
            const produtos = await query(produtosSql, params);
            
            // Vendas por dia
            const vendasDiaSql = `
                SELECT 
                    DATE(p.data_pedido) as data,
                    COUNT(p.id_pedido) as pedidos,
                    SUM(p.valor_total) as receita
                FROM pedido p
                ${whereClause}
                GROUP BY DATE(p.data_pedido)
                ORDER BY data DESC
                LIMIT 31
            `;
            
            const vendasDia = await query(vendasDiaSql, params);
            
            // Top clientes
            const clientesSql = `
                SELECT 
                    u.id_usuario,
                    u.nome_completo,
                    COUNT(p.id_pedido) as total_pedidos,
                    SUM(p.valor_total) as total_gasto
                FROM pedido p
                INNER JOIN usuario u ON p.id_usuario = u.id_usuario
                ${whereClause}
                GROUP BY u.id_usuario, u.nome_completo
                ORDER BY total_gasto DESC
                LIMIT 10
            `;
            
            const clientes = await query(clientesSql, params);
            
            // Formas de pagamento
            const pagamentosSql = `
                SELECT 
                    p.pagamento as metodo,
                    COUNT(p.id_pedido) as quantidade,
                    SUM(p.valor_total) as receita
                FROM pedido p
                ${whereClause}
                GROUP BY p.pagamento
                ORDER BY receita DESC
            `;
            
            const pagamentos = await query(pagamentosSql, params);
            
            res.json({
                periodo: {
                    mes: mes || 'Todos',
                    ano: ano || 'Todos'
                },
                resumo: resumo.rows[0],
                produtosMaisVendidos: produtos.rows,
                vendasPorDia: vendasDia.rows,
                topClientes: clientes.rows,
                formasPagamento: pagamentos.rows,
                geradoEm: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Erro ao gerar relatório de vendas:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // COMPARATIVO MENSAL
    // ========================
    static async getComparativoMensal(req, res) {
        try {
            const { ano } = req.query;
            
            let whereClause = "WHERE p.pagamento = 'Aprovado'";
            let params = [];
            
            if (ano) {
                whereClause += " AND EXTRACT(YEAR FROM p.data_pedido) = $1";
                params = [ano];
            }
            
            const sql = `
                SELECT 
                    EXTRACT(MONTH FROM p.data_pedido) as mes,
                    COUNT(p.id_pedido) as total_pedidos,
                    SUM(p.valor_total) as receita_total
                FROM pedido p
                ${whereClause}
                GROUP BY EXTRACT(MONTH FROM p.data_pedido)
                ORDER BY mes
            `;
            
            const result = await query(sql, params);
            
            res.json({
                ano: ano || new Date().getFullYear(),
                meses: result.rows
            });
            
        } catch (error) {
            console.error('Erro ao gerar comparativo mensal:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
}

module.exports = RelatorioVendasController;