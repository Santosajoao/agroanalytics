const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const propCtrl = require('../controllers/propriedadeController');
const talhaoCtrl = require('../controllers/talhaoController');
const analiseCtrl = require('../controllers/analiseController');
const chuvaCtrl = require('../controllers/chuvaController');
const prodCtrl = require('../controllers/produtividadeController');
const relCtrl = require('../controllers/relatorioController');

// Auth
router.post('/auth/registrar', authCtrl.registrar);
router.post('/auth/login', authCtrl.login);
router.get('/auth/perfil', auth, authCtrl.perfil);

// Propriedades
router.get('/propriedades', auth, propCtrl.listar);
router.post('/propriedades', auth, propCtrl.criar);
router.get('/propriedades/:id', auth, propCtrl.obter);
router.put('/propriedades/:id', auth, propCtrl.atualizar);
router.delete('/propriedades/:id', auth, propCtrl.excluir);

// Talhões
router.get('/propriedades/:propriedadeId/talhoes', auth, talhaoCtrl.listarPorPropriedade);
router.post('/talhoes', auth, talhaoCtrl.criar);
router.get('/talhoes/:id', auth, talhaoCtrl.obter);
router.put('/talhoes/:id', auth, talhaoCtrl.atualizar);
router.delete('/talhoes/:id', auth, talhaoCtrl.excluir);

// Análises de solo
router.get('/talhoes/:talhaoId/analises', auth, analiseCtrl.listar);
router.post('/analises', auth, analiseCtrl.criar);
router.get('/analises/:id', auth, analiseCtrl.obter);
router.delete('/analises/:id', auth, analiseCtrl.excluir);
router.post('/analises/calagem', auth, analiseCtrl.calcularCalagem);

// Pluviometria
router.get('/chuva', auth, chuvaCtrl.listar);
router.post('/chuva', auth, chuvaCtrl.criar);
router.post('/chuva/lote', auth, chuvaCtrl.criarLote);
router.delete('/chuva/:id', auth, chuvaCtrl.excluir);
router.get('/chuva/comparativo', auth, chuvaCtrl.comparativoPorPropriedade);

// Produtividade / Ciclos
router.get('/ciclos', auth, prodCtrl.listar);
router.post('/ciclos', auth, prodCtrl.criar);
router.put('/ciclos/:id', auth, prodCtrl.atualizar);
router.delete('/ciclos/:id', auth, prodCtrl.excluir);

// Relatórios
router.get('/relatorios/dashboard', auth, relCtrl.dashboard);
router.get('/relatorios/completo', auth, relCtrl.relatorioCompleto);

module.exports = router;
