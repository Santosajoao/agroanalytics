const pool = require('../../config/database');
const { calcularCalagemTalhao } = require('./analiseController');

exports.relatorioCompleto = async (req, res) => {
  const { propriedade_id, safra = '2024/2025' } = req.query;
  try {
    const prop = await pool.query(
      'SELECT * FROM propriedades WHERE id=$1 AND usuario_id=$2',
      [propriedade_id, req.usuario.id]
    );
    if (!prop.rows.length) return res.status(404).json({ erro: 'Propriedade não encontrada.' });

    const talhoes = await pool.query(
      'SELECT * FROM talhoes WHERE propriedade_id=$1 ORDER BY nome',
      [propriedade_id]
    );

    const relatorio = {
      propriedade: prop.rows[0],
      safra,
      gerado_em: new Date().toISOString(),
      talhoes: [],
      resumo: {
        total_talhoes: talhoes.rows.length,
        total_area_ha: 0,
        media_produtividade_soja: null,
        media_produtividade_milho: null,
        total_chuva_media: 0,
        talhoes_com_analise: 0,
        talhoes_precisam_calagem: 0,
        total_calcario_necessario: 0,
      }
    };

    let sojas = [], milhos = [], totalChuva = 0;

    for (const t of talhoes.rows) {
      // Última análise de solo na safra
      const analiseR = await pool.query(
        'SELECT * FROM analises_solo WHERE talhao_id=$1 AND safra=$2 ORDER BY data_coleta DESC LIMIT 1',
        [t.id, safra]
      );
      const analise = analiseR.rows[0] || null;

      // Pluviometria
      const chuvaR = await pool.query(
        `SELECT COALESCE(SUM(precipitacao_mm),0) AS total, COUNT(*) AS eventos,
                MAX(precipitacao_mm) AS maior
         FROM registros_chuva WHERE talhao_id=$1 AND safra=$2`,
        [t.id, safra]
      );
      const chuva = chuvaR.rows[0];

      // Ciclo/produtividade
      const cicloR = await pool.query(
        'SELECT * FROM ciclos_cultura WHERE talhao_id=$1 AND safra=$2',
        [t.id, safra]
      );
      const ciclo = cicloR.rows[0] || null;

      // Calagem
      let calagem = null;
      if (analise) {
        calagem = calcularCalagemTalhao(analise, t.cultura_atual);
        if (calagem && t.area_ha) calagem.total_propriedade = Math.round(calagem.necessidade_calcario * t.area_ha * 100) / 100;
      }

      // Insumos
      const insumosR = await pool.query(
        'SELECT * FROM aplicacoes_insumos WHERE talhao_id=$1 AND safra=$2 ORDER BY data_aplicacao',
        [t.id, safra]
      );

      const dadosTalhao = {
        talhao: t,
        analise_solo: analise,
        calagem,
        pluviometria: {
          total_mm: parseFloat(chuva.total),
          total_eventos: parseInt(chuva.eventos),
          maior_evento_mm: parseFloat(chuva.maior || 0),
        },
        ciclo_cultura: ciclo,
        insumos: insumosR.rows,
      };

      relatorio.talhoes.push(dadosTalhao);

      // Acumuladores do resumo
      relatorio.resumo.total_area_ha += parseFloat(t.area_ha || 0);
      totalChuva += parseFloat(chuva.total);
      if (analise) relatorio.resumo.talhoes_com_analise++;
      if (calagem && calagem.necessidade_calcario > 0) {
        relatorio.resumo.talhoes_precisam_calagem++;
        relatorio.resumo.total_calcario_necessario += calagem.total_propriedade || 0;
      }
      if (ciclo?.produtividade) {
        if (ciclo.cultura === 'Soja') sojas.push(parseFloat(ciclo.produtividade));
        if (ciclo.cultura === 'Milho') milhos.push(parseFloat(ciclo.produtividade));
      }
    }

    relatorio.resumo.total_area_ha = Math.round(relatorio.resumo.total_area_ha * 100) / 100;
    relatorio.resumo.total_calcario_necessario = Math.round(relatorio.resumo.total_calcario_necessario * 100) / 100;
    relatorio.resumo.total_chuva_media = talhoes.rows.length ? Math.round(totalChuva / talhoes.rows.length * 10) / 10 : 0;
    relatorio.resumo.media_produtividade_soja = sojas.length ? Math.round((sojas.reduce((a, b) => a + b, 0) / sojas.length) * 10) / 10 : null;
    relatorio.resumo.media_produtividade_milho = milhos.length ? Math.round((milhos.reduce((a, b) => a + b, 0) / milhos.length) * 10) / 10 : null;

    res.json(relatorio);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.dashboard = async (req, res) => {
  try {
    const props = await pool.query(
      `SELECT COUNT(*)::int AS total_propriedades,
              COALESCE(SUM(area_total),0) AS area_total
       FROM propriedades WHERE usuario_id=$1`,
      [req.usuario.id]
    );
    const talhoes = await pool.query(
      `SELECT COUNT(t.id)::int AS total_talhoes
       FROM talhoes t JOIN propriedades p ON p.id=t.propriedade_id
       WHERE p.usuario_id=$1`,
      [req.usuario.id]
    );
    const analises = await pool.query(
      `SELECT COUNT(a.id)::int AS total_analises
       FROM analises_solo a JOIN talhoes t ON t.id=a.talhao_id
       JOIN propriedades p ON p.id=t.propriedade_id WHERE p.usuario_id=$1`,
      [req.usuario.id]
    );
    const prod = await pool.query(
      `SELECT cc.cultura, ROUND(AVG(cc.produtividade)::numeric,1) AS media
       FROM ciclos_cultura cc JOIN talhoes t ON t.id=cc.talhao_id
       JOIN propriedades p ON p.id=t.propriedade_id WHERE p.usuario_id=$1 GROUP BY cc.cultura`,
      [req.usuario.id]
    );
    const alertas = await pool.query(
      `SELECT t.nome AS talhao, p.nome AS propriedade, a.saturacao_bases, a.ctc, t.cultura_atual
       FROM analises_solo a JOIN talhoes t ON t.id=a.talhao_id
       JOIN propriedades p ON p.id=t.propriedade_id
       WHERE p.usuario_id=$1 AND a.saturacao_bases < 55
       ORDER BY a.saturacao_bases ASC LIMIT 5`,
      [req.usuario.id]
    );

    res.json({
      ...props.rows[0],
      ...talhoes.rows[0],
      ...analises.rows[0],
      produtividade_media: prod.rows,
      alertas_solo: alertas.rows,
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
