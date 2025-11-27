// backend/routes/relatorioVendasRoutes.js
const express = require('express');
const RelatorioVendasController = require('../controllers/relatorioVendasController');

const router = express.Router();

// GET /api/relatorios/vendas - Relatório de vendas por período
router.get('/vendas', RelatorioVendasController.getRelatorioVendas);

// GET /api/relatorios/vendas/comparativo - Comparativo mensal
router.get('/vendas/comparativo', RelatorioVendasController.getComparativoMensal);

module.exports = router;