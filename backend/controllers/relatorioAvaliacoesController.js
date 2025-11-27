// backend/controllers/relatorioAvaliacoesController.js
const { query } = require('../database');

class RelatorioAvaliacoesController {
    
    // ========================
    // RELATÓRIO DE AVALIAÇÕES
    // ========================
    static async getRelatorioAvaliacoes(req, res) {
        try {
            const { mes, ano } = req.query;
            
            let whereClause = "WHERE 1=1";
            let params = [];
            let paramCount = 0;
            
            // Filtra por mês e ano se fornecido
            if (mes && ano) {
                paramCount += 2;
                whereClause += ` AND EXTRACT(MONTH FROM a.data_avaliacao) = $${paramCount-1} AND EXTRACT(YEAR FROM a.data_avaliacao) = $${paramCount}`;
                params = [mes, ano];
            } else if (ano) {
                paramCount += 1;
                whereClause += ` AND EXTRACT(YEAR FROM a.data_avaliacao) = $${paramCount}`;
                params = [ano];
            }
            
            // Resumo geral
            const resumoSql = `
                SELECT 
                    COUNT(a.id_avaliacao) as total_avaliacoes,
                    COUNT(DISTINCT a.id_usuario) as usuarios_avaliaram,
                    COUNT(DISTINCT a.id_produto) as produtos_avaliados,
                    ROUND(AVG(a.nota)::numeric, 2) as nota_media_geral
                FROM avaliacao a
                ${whereClause}
            `;
            
            const resumo = await query(resumoSql, params);
            
            // Produtos mais bem avaliados
            const produtosMelhoresSql = `
                SELECT 
                    p.id_produto,
                    p.nome_produto,
                    ROUND(AVG(a.nota)::numeric, 2) as nota_media,
                    COUNT(a.id_avaliacao) as total_avaliacoes,
                    MIN(a.nota) as pior_nota,
                    MAX(a.nota) as melhor_nota
                FROM produto p
                INNER JOIN avaliacao a ON p.id_produto = a.id_produto
                ${whereClause}
                GROUP BY p.id_produto, p.nome_produto
                HAVING COUNT(a.id_avaliacao) >= 1
                ORDER BY nota_media DESC, total_avaliacoes DESC
                LIMIT 10
            `;
            
            const produtosMelhores = await query(produtosMelhoresSql, params);
            
            // Produtos mais avaliados
            const produtosMaisAvaliadosSql = `
                SELECT 
                    p.id_produto,
                    p.nome_produto,
                    ROUND(AVG(a.nota)::numeric, 2) as nota_media,
                    COUNT(a.id_avaliacao) as total_avaliacoes
                FROM produto p
                INNER JOIN avaliacao a ON p.id_produto = a.id_produto
                ${whereClause}
                GROUP BY p.id_produto, p.nome_produto
                ORDER BY total_avaliacoes DESC, nota_media DESC
                LIMIT 10
            `;
            
            const produtosMaisAvaliados = await query(produtosMaisAvaliadosSql, params);
            
            // Distribuição de notas
            const distribuicaoNotasSql = `
                SELECT 
                    nota,
                    COUNT(*) as quantidade
                FROM avaliacao a
                ${whereClause}
                GROUP BY nota
                ORDER BY nota DESC
            `;
            
            const distribuicaoNotas = await query(distribuicaoNotasSql, params);
            
            // Avaliações por mês (para gráfico)
            const avaliacoesPorMesSql = `
                SELECT 
                    EXTRACT(MONTH FROM a.data_avaliacao) as mes,
                    EXTRACT(YEAR FROM a.data_avaliacao) as ano,
                    COUNT(a.id_avaliacao) as total_avaliacoes,
                    ROUND(AVG(a.nota)::numeric, 2) as nota_media
                FROM avaliacao a
                ${whereClause}
                GROUP BY EXTRACT(YEAR FROM a.data_avaliacao), EXTRACT(MONTH FROM a.data_avaliacao)
                ORDER BY ano, mes
            `;
            
            const avaliacoesPorMes = await query(avaliacoesPorMesSql, params);
            
            res.json({
                periodo: {
                    mes: mes || 'Todos',
                    ano: ano || 'Todos'
                },
                resumo: resumo.rows[0],
                produtosMelhoresAvaliados: produtosMelhores.rows,
                produtosMaisAvaliados: produtosMaisAvaliados.rows,
                distribuicaoNotas: distribuicaoNotas.rows,
                avaliacoesPorMes: avaliacoesPorMes.rows,
                geradoEm: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Erro ao gerar relatório de avaliações:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
}

module.exports = RelatorioAvaliacoesController;