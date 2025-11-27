// backend/routes/relatorioAvaliacoesRoutes.js
const express = require('express');
const RelatorioAvaliacoesController = require('../controllers/relatorioAvaliacoesController');

const router = express.Router();

// GET /api/relatorios/avaliacoes - Relatório de avaliações por período
router.get('/avaliacoes', RelatorioAvaliacoesController.getRelatorioAvaliacoes);

module.exports = router;