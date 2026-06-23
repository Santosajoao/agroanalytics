const pool = require('../../config/database');

async function verificarTalhao(talhaoId, usuarioId) {
  const r = await pool.query(
    `SELECT t.id, t.cultura_atual FROM talhoes t
     JOIN propriedades p ON p.id=t.propriedade_id
     WHERE t.id=$1 AND p.usuario_id=$2`, [talhaoId, usuarioId]
  );
  return r.rows[0] || null;
}

// Fórmula de calagem: NC = (V2 - V1) * CTC / (10 * PRNT/100)
// Ref: Manual EMBRAPA / Saturação por Bases (IAPAR PR)
function calcularCalagem(analise, cultura, PRNT = 80) {
  const V2_cultura = {
    'Soja': 65, 'Milho': 70, 'Trigo': 65, 'Café': 60,
    'Cana': 60, 'Arroz': 55, 'Feijão': 65,
  };

  const V2 = V2_cultura[cultura] || 65;
  const V1 = parseFloat(analise.saturacao_bases);
  const CTC = parseFloat(analise.ctc);

  // Evita erros caso os dados da análise venham vazios ou zerados
  if (isNaN(V1) || isNaN(CTC)) return null;

  // Se o solo já tem mais bases do que o necessário, não precisa calcário
  if (V1 >= V2) {
    return { necessidade_calcario: 0, V2, V1, CTC, PRNT, status: 'adequado' };
  }

  // FÓRMULA CORRIGIDA: ((V2 - V1) * CTC) / PRNT
  const nc = ((V2 - V1) * CTC) / PRNT;
  const ncRound = Math.round(nc * 100) / 100;

  return {
    necessidade_calcario: ncRound,
    V2, 
    V1, 
    CTC, 
    PRNT,
    status: ncRound > 3 ? 'critico' : ncRound > 1.5 ? 'alto' : ncRound > 0 ? 'moderado' : 'adequado',
  };
}


exports.listar = async (req, res) => {
  try {
    const talhao = await verificarTalhao(req.params.talhaoId, req.usuario.id);
    if (!talhao) return res.status(404).json({ erro: 'Talhão não encontrado.' });
    const r = await pool.query(
      'SELECT * FROM analises_solo WHERE talhao_id=$1 ORDER BY data_coleta DESC',
      [req.params.talhaoId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.obter = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM analises_solo WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ erro: 'Análise não encontrada.' });
    const analise = r.rows[0];
    const talhao = await verificarTalhao(analise.talhao_id, req.usuario.id);
    if (!talhao) return res.status(403).json({ erro: 'Acesso negado.' });
    res.json(analise);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  const { talhao_id, safra, data_coleta, laboratorio, ph, saturacao_bases, fosforo,
    potassio, calcio, magnesio, materia_organica, ctc, aluminio, enxofre,
    boro, cobre, ferro, manganes, zinco, observacoes } = req.body;
  if (!talhao_id || !data_coleta) return res.status(400).json({ erro: 'Talhão e data são obrigatórios.' });
  try {
    const talhao = await verificarTalhao(talhao_id, req.usuario.id);
    if (!talhao) return res.status(404).json({ erro: 'Talhão não encontrado.' });
    const r = await pool.query(
      `INSERT INTO analises_solo (talhao_id,safra,data_coleta,laboratorio,ph,saturacao_bases,
       fosforo,potassio,calcio,magnesio,materia_organica,ctc,aluminio,enxofre,boro,cobre,ferro,manganes,zinco,observacoes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [talhao_id, safra, data_coleta, laboratorio, ph, saturacao_bases, fosforo,
       potassio, calcio, magnesio, materia_organica, ctc, aluminio, enxofre,
       boro, cobre, ferro, manganes, zinco, observacoes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.excluir = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM analises_solo WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ erro: 'Análise não encontrada.' });
    const talhao = await verificarTalhao(r.rows[0].talhao_id, req.usuario.id);
    if (!talhao) return res.status(403).json({ erro: 'Acesso negado.' });
    await pool.query('DELETE FROM analises_solo WHERE id=$1', [req.params.id]);
    res.json({ mensagem: 'Análise removida.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.calcularCalagem = async (req, res) => {
  const { analise_id, prnt = 80 } = req.body;
  try {
    const ar = await pool.query('SELECT * FROM analises_solo WHERE id=$1', [analise_id]);
    if (!ar.rows.length) return res.status(404).json({ erro: 'Análise não encontrada.' });
    const analise = ar.rows[0];
    const talhao = await verificarTalhao(analise.talhao_id, req.usuario.id);
    if (!talhao) return res.status(403).json({ erro: 'Acesso negado.' });
    const tr = await pool.query('SELECT * FROM talhoes WHERE id=$1', [analise.talhao_id]);
    const t = tr.rows[0];
    const resultado = calcularCalagem(analise, t.cultura_atual, parseFloat(prnt));
    if (!resultado) return res.status(400).json({ erro: 'Dados insuficientes para o cálculo.' });
    const totalHa = t.area_ha ? resultado.necessidade_calcario * parseFloat(t.area_ha) : null;
    res.json({ ...resultado, area_ha: t.area_ha, total_calcario_ha: totalHa, cultura: t.cultura_atual, talhao: t.nome });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.calcularCalagemTalhao = calcularCalagem;
