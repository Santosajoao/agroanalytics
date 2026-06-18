const pool = require('../../config/database');

exports.listar = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.*, COUNT(t.id)::int AS total_talhoes
       FROM propriedades p
       LEFT JOIN talhoes t ON t.propriedade_id = p.id
       WHERE p.usuario_id=$1
       GROUP BY p.id ORDER BY p.criado_em DESC`,
      [req.usuario.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.obter = async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM propriedades WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.usuario.id]
    );
    if (!r.rows.length) return res.status(404).json({ erro: 'Propriedade não encontrada.' });
    const talhoes = await pool.query('SELECT * FROM talhoes WHERE propriedade_id=$1 ORDER BY nome', [req.params.id]);
    res.json({ ...r.rows[0], talhoes: talhoes.rows });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  const { nome, area_total, municipio, estado, cep, latitude, longitude, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const r = await pool.query(
      `INSERT INTO propriedades (usuario_id,nome,area_total,municipio,estado,cep,latitude,longitude,observacoes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.usuario.id, nome, area_total, municipio, estado || 'PR', cep, latitude, longitude, observacoes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.atualizar = async (req, res) => {
  const { nome, area_total, municipio, estado, cep, latitude, longitude, observacoes } = req.body;
  try {
    const r = await pool.query(
      `UPDATE propriedades SET nome=$1,area_total=$2,municipio=$3,estado=$4,cep=$5,
       latitude=$6,longitude=$7,observacoes=$8,atualizado_em=NOW()
       WHERE id=$9 AND usuario_id=$10 RETURNING *`,
      [nome, area_total, municipio, estado, cep, latitude, longitude, observacoes, req.params.id, req.usuario.id]
    );
    if (!r.rows.length) return res.status(404).json({ erro: 'Propriedade não encontrada.' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.excluir = async (req, res) => {
  try {
    const r = await pool.query(
      'DELETE FROM propriedades WHERE id=$1 AND usuario_id=$2 RETURNING id',
      [req.params.id, req.usuario.id]
    );
    if (!r.rows.length) return res.status(404).json({ erro: 'Propriedade não encontrada.' });
    res.json({ mensagem: 'Propriedade removida.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
