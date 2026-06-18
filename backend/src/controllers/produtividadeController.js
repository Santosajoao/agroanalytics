const pool = require('../../config/database');

async function verificarTalhao(talhaoId, usuarioId) {
  const r = await pool.query(
    `SELECT t.id,t.nome,t.area_ha,t.cultura_atual FROM talhoes t
     JOIN propriedades p ON p.id=t.propriedade_id
     WHERE t.id=$1 AND p.usuario_id=$2`, [talhaoId, usuarioId]
  );
  return r.rows[0] || null;
}

exports.listar = async (req, res) => {
  const { talhao_id, safra } = req.query;
  try {
    let q = `SELECT cc.*, t.nome AS talhao_nome, t.area_ha, p.nome AS propriedade_nome
             FROM ciclos_cultura cc
             JOIN talhoes t ON t.id=cc.talhao_id
             JOIN propriedades p ON p.id=t.propriedade_id
             WHERE p.usuario_id=$1`;
    const params = [req.usuario.id];
    if (talhao_id) { params.push(talhao_id); q += ` AND cc.talhao_id=$${params.length}`; }
    if (safra) { params.push(safra); q += ` AND cc.safra=$${params.length}`; }
    q += ' ORDER BY cc.safra DESC, t.nome';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  const { talhao_id, safra, cultura, data_plantio, data_colheita, produtividade, unidade_produtividade, observacoes } = req.body;
  if (!talhao_id || !safra || !cultura) return res.status(400).json({ erro: 'Talhão, safra e cultura são obrigatórios.' });
  try {
    if (!await verificarTalhao(talhao_id, req.usuario.id))
      return res.status(404).json({ erro: 'Talhão não encontrado.' });
    // Evita duplicata talhao+safra
    await pool.query('DELETE FROM ciclos_cultura WHERE talhao_id=$1 AND safra=$2', [talhao_id, safra]);
    const r = await pool.query(
      `INSERT INTO ciclos_cultura (talhao_id,safra,cultura,data_plantio,data_colheita,produtividade,unidade_produtividade,observacoes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [talhao_id, safra, cultura, data_plantio, data_colheita, produtividade, unidade_produtividade || 'sc/ha', observacoes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.atualizar = async (req, res) => {
  const { safra, cultura, data_plantio, data_colheita, produtividade, unidade_produtividade, observacoes } = req.body;
  try {
    const cc = await pool.query('SELECT * FROM ciclos_cultura WHERE id=$1', [req.params.id]);
    if (!cc.rows.length) return res.status(404).json({ erro: 'Ciclo não encontrado.' });
    if (!await verificarTalhao(cc.rows[0].talhao_id, req.usuario.id)) return res.status(403).json({ erro: 'Acesso negado.' });
    const r = await pool.query(
      `UPDATE ciclos_cultura SET safra=$1,cultura=$2,data_plantio=$3,data_colheita=$4,
       produtividade=$5,unidade_produtividade=$6,observacoes=$7,atualizado_em=NOW()
       WHERE id=$8 RETURNING *`,
      [safra, cultura, data_plantio, data_colheita, produtividade, unidade_produtividade, observacoes, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.excluir = async (req, res) => {
  try {
    const cc = await pool.query('SELECT * FROM ciclos_cultura WHERE id=$1', [req.params.id]);
    if (!cc.rows.length) return res.status(404).json({ erro: 'Ciclo não encontrado.' });
    if (!await verificarTalhao(cc.rows[0].talhao_id, req.usuario.id)) return res.status(403).json({ erro: 'Acesso negado.' });
    await pool.query('DELETE FROM ciclos_cultura WHERE id=$1', [req.params.id]);
    res.json({ mensagem: 'Ciclo removido.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
