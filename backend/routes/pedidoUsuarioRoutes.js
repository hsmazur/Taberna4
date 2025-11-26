// routes/pedidoUsuarioRoutes.js
const express = require('express');
const router = express.Router();
const pedidoUsuarioController = require('../controllers/pedidoUsuarioController');

// ========================
// ROTAS PARA PEDIDOS DO USUÁRIO
// ========================

// GET /api/pedidos/usuario/:id - Buscar todos os pedidos de um usuário
router.get('/usuario/:id', pedidoUsuarioController.buscarPedidosUsuario);

// GET /api/pedidos/usuario/:id/pedido/:pedidoId - Buscar detalhe de um pedido específico
router.get('/usuario/:id/pedido/:pedidoId', pedidoUsuarioController.buscarDetalhePedidoUsuario);

// GET /api/pedidos/usuario/:id/estatisticas - Obter estatísticas dos pedidos do usuário
router.get('/usuario/:id/estatisticas', pedidoUsuarioController.obterEstatisticasUsuario);

module.exports = router;