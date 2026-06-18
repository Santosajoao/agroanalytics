const pool = require('../../config/database');

async function verificarTalhao(talhaoId, usuarioId) {
  const r = await pool.query(
    `SELECT t.id FROM talhoes t JOIN propriedades p ON p.id=t.propriedade_id
     WHERE t.id=$1 AND p.usuario_id=$2`, [talhaoId, usuarioId]
  );
  return r.rows.length > 0;
}

exports.listar = async (req, res) => {
  const { talhao_id, safra, data_inicio, data_fim } = req.query;
  try {
    if (!talhao_id) return res.status(400).json({ erro: 'talhao_id é obrigatório.' });
    if (!await verificarTalhao(talhao_id, req.usuario.id))
      return res.status(404).json({ erro: 'Talhão não encontrado.' });

    let q = 'SELECT * FROM registros_chuva WHERE talhao_id=$1';
    const params = [talhao_id];
    if (safra) { params.push(safra); q += ` AND safra=$${params.length}`; }
    if (data_inicio) { params.push(data_inicio); q += ` AND data_registro>=$${params.length}`; }
    if (data_fim) { params.push(data_fim); q += ` AND data_registro<=$${params.length}`; }
    q += ' ORDER BY data_registro ASC';
    const r = await pool.query(q, params);

    // Métricas
    const total = r.rows.reduce((s, c) => s + parseFloat(c.precipitacao_mm), 0);
    const maxEvento = r.rows.reduce((m, c) => Math.max(m, parseFloat(c.precipitacao_mm)), 0);
    res.json({
      registros: r.rows,
      metricas: {
        total_mm: Math.round(total * 10) / 10,
        total_eventos: r.rows.length,
        media_por_evento: r.rows.length ? Math.round((total / r.rows.length) * 10) / 10 : 0,
        maior_evento_mm: maxEvento,
      }
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  const { talhao_id, safra, data_registro, precipitacao_mm, fonte, observacoes } = req.body;
  if (!talhao_id || !data_registro || !precipitacao_mm)
    return res.status(400).json({ erro: 'Talhão, data e precipitação são obrigatórios.' });
  try {
    if (!await verificarTalhao(talhao_id, req.usuario.id))
      return res.status(404).json({ erro: 'Talhão não encontrado.' });
    const r = await pool.query(
      `INSERT INTO registros_chuva (talhao_id,safra,data_registro,precipitacao_mm,fonte,observacoes)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [talhao_id, safra, data_registro, precipitacao_mm, fonte || 'manual', observacoes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criarLote = async (req, res) => {
  const { registros } = req.body;
  if (!Array.isArray(registros) || !registros.length)
    return res.status(400).json({ erro: 'Envie um array de registros.' });
  try {
    const inseridos = [];
    for (const rc of registros) {
      if (!await verificarTalhao(rc.talhao_id, req.usuario.id)) continue;
      const r = await pool.query(
        `INSERT INTO registros_chuva (talhao_id,safra,data_registro,precipitacao_mm,fonte,observacoes)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [rc.talhao_id, rc.safra, rc.data_registro, rc.precipitacao_mm, rc.fonte || 'manual', rc.observacoes]
      );
      inseridos.push(r.rows[0]);
    }
    res.status(201).json({ inseridos: inseridos.length, registros: inseridos });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.excluir = async (req, res) => {
  try {
    const rc = await pool.query('SELECT * FROM registros_chuva WHERE id=$1', [req.params.id]);
    if (!rc.rows.length) return res.status(404).json({ erro: 'Registro não encontrado.' });
    if (!await verificarTalhao(rc.rows[0].talhao_id, req.usuario.id))
      return res.status(403).json({ erro: 'Acesso negado.' });
    await pool.query('DELETE FROM registros_chuva WHERE id=$1', [req.params.id]);
    res.json({ mensagem: 'Registro removido.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.comparativoPorPropriedade = async (req, res) => {
  const { propriedade_id, safra } = req.query;
  try {
    const prop = await pool.query('SELECT id FROM propriedades WHERE id=$1 AND usuario_id=$2', [propriedade_id, req.usuario.id]);
    if (!prop.rows.length) return res.status(404).json({ erro: 'Propriedade não encontrada.' });
    const r = await pool.query(
      `SELECT t.id, t.nome, t.area_ha, t.cultura_atual,
        COALESCE(SUM(rc.precipitacao_mm),0) AS total_mm,
        COUNT(rc.id) AS total_eventos,
        MAX(rc.precipitacao_mm) AS maior_evento
       FROM talhoes t
       LEFT JOIN registros_chuva rc ON rc.talhao_id=t.id AND ($2::text IS NULL OR rc.safra=$2)
       WHERE t.propriedade_id=$1 GROUP BY t.id ORDER BY t.nome`,
      [propriedade_id, safra || null]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
