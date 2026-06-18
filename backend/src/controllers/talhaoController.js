const pool = require('../../config/database');

// Verifica se o talhão pertence ao usuário logado
async function verificarPosse(talhaoId, usuarioId) {
  const r = await pool.query(
    `SELECT t.id FROM talhoes t
     JOIN propriedades p ON p.id = t.propriedade_id
     WHERE t.id=$1 AND p.usuario_id=$2`, [talhaoId, usuarioId]
  );
  return r.rows.length > 0;
}

exports.listarPorPropriedade = async (req, res) => {
  try {
    // Verifica que a propriedade pertence ao usuário
    const prop = await pool.query(
      'SELECT id FROM propriedades WHERE id=$1 AND usuario_id=$2',
      [req.params.propriedadeId, req.usuario.id]
    );
    if (!prop.rows.length) return res.status(404).json({ erro: 'Propriedade não encontrada.' });

    const r = await pool.query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM analises_solo a WHERE a.talhao_id=t.id) AS total_analises,
        (SELECT COUNT(*) FROM registros_chuva rc WHERE rc.talhao_id=t.id) AS total_registros_chuva
       FROM talhoes t WHERE t.propriedade_id=$1 ORDER BY t.nome`,
      [req.params.propriedadeId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.obter = async (req, res) => {
  try {
    if (!await verificarPosse(req.params.id, req.usuario.id))
      return res.status(404).json({ erro: 'Talhão não encontrado.' });
    const r = await pool.query('SELECT * FROM talhoes WHERE id=$1', [req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  const { propriedade_id, nome, area_ha, cultura_atual, latitude, longitude, geometria_json, observacoes } = req.body;
  if (!nome || !propriedade_id) return res.status(400).json({ erro: 'Nome e propriedade são obrigatórios.' });
  try {
    const prop = await pool.query(
      'SELECT id FROM propriedades WHERE id=$1 AND usuario_id=$2',
      [propriedade_id, req.usuario.id]
    );
    if (!prop.rows.length) return res.status(403).json({ erro: 'Propriedade não encontrada.' });

    const r = await pool.query(
      `INSERT INTO talhoes (propriedade_id,nome,area_ha,cultura_atual,latitude,longitude,geometria_json,observacoes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [propriedade_id, nome, area_ha, cultura_atual, latitude, longitude,
       geometria_json ? JSON.stringify(geometria_json) : null, observacoes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.atualizar = async (req, res) => {
  const { nome, area_ha, cultura_atual, latitude, longitude, geometria_json, observacoes } = req.body;
  try {
    if (!await verificarPosse(req.params.id, req.usuario.id))
      return res.status(404).json({ erro: 'Talhão não encontrado.' });
    const r = await pool.query(
      `UPDATE talhoes SET nome=$1,area_ha=$2,cultura_atual=$3,latitude=$4,longitude=$5,
       geometria_json=$6,observacoes=$7,atualizado_em=NOW() WHERE id=$8 RETURNING *`,
      [nome, area_ha, cultura_atual, latitude, longitude,
       geometria_json ? JSON.stringify(geometria_json) : null, observacoes, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.excluir = async (req, res) => {
  try {
    if (!await verificarPosse(req.params.id, req.usuario.id))
      return res.status(404).json({ erro: 'Talhão não encontrado.' });
    await pool.query('DELETE FROM talhoes WHERE id=$1', [req.params.id]);
    res.json({ mensagem: 'Talhão removido.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
