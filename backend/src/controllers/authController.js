const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');

exports.registrar = async (req, res) => {
  const { nome, email, senha, telefone } = req.body;
  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existe.rows.length > 0)
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    const hash = await bcrypt.hash(senha, 10);
    const r = await pool.query(
      'INSERT INTO usuarios (nome,email,senha_hash,telefone) VALUES($1,$2,$3,$4) RETURNING id,nome,email,tipo',
      [nome, email, hash, telefone]
    );
    const u = r.rows[0];
    const token = jwt.sign({ id: u.id, email: u.email, tipo: u.tipo }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ token, usuario: u });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno.', detalhe: e.message });
  }
};

exports.login = async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  try {
    const r = await pool.query('SELECT * FROM usuarios WHERE email=$1 AND ativo=true', [email]);
    if (!r.rows.length)
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    const u = r.rows[0];
    const ok = await bcrypt.compare(senha, u.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas.' });
    const token = jwt.sign({ id: u.id, email: u.email, tipo: u.tipo }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, usuario: { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo } });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno.' });
  }
};

exports.perfil = async (req, res) => {
  try {
    const r = await pool.query('SELECT id,nome,email,telefone,tipo,criado_em FROM usuarios WHERE id=$1', [req.usuario.id]);
    if (!r.rows.length) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno.' });
  }
};
