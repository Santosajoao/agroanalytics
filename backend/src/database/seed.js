require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'agroanalytics',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('🌱 Iniciando seed do banco de dados...');

    // Usuário demo
    const senhaHash = await bcrypt.hash('123456', 10);
    const userRes = await client.query(`
      INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id
    `, ['João Pedro Santos de Araújo', 'joao@agroanalytics.com', senhaHash, '(43) 99999-0001', 'produtor']);
    const userId = userRes.rows[0].id;
    console.log('✅ Usuário demo criado  →  email: joao@agroanalytics.com  senha: 123456');

    // Propriedade 1
    const prop1 = await client.query(`
      INSERT INTO propriedades (usuario_id, nome, area_total, municipio, estado, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [userId, 'Fazenda São João', 350, 'Cornélio Procópio', 'PR', -23.1050, -50.6480]);
    const propId1 = prop1.rows[0].id;

    // Propriedade 2
    const prop2 = await client.query(`
      INSERT INTO propriedades (usuario_id, nome, area_total, municipio, estado, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [userId, 'Sítio Boa Esperança', 120, 'Assaí', 'PR', -23.3700, -50.8500]);
    const propId2 = prop2.rows[0].id;
    console.log('✅ Propriedades criadas');

    // Talhões da Fazenda São João
    const talhoes1 = [
      { nome: 'Talhão Norte', area: 85, cultura: 'Soja', lat: -23.098, lng: -50.641 },
      { nome: 'Talhão Sul', area: 95, cultura: 'Milho', lat: -23.115, lng: -50.655 },
      { nome: 'Talhão Leste', area: 75, cultura: 'Soja', lat: -23.105, lng: -50.630 },
      { nome: 'Talhão Oeste', area: 95, cultura: 'Soja', lat: -23.108, lng: -50.668 },
    ];
    const talhaoIds1 = [];
    for (const t of talhoes1) {
      const r = await client.query(`
        INSERT INTO talhoes (propriedade_id, nome, area_ha, cultura_atual, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, [propId1, t.nome, t.area, t.cultura, t.lat, t.lng]);
      talhaoIds1.push(r.rows[0].id);
    }

    // Talhões do Sítio
    const talhoes2 = [
      { nome: 'Talhão A', area: 60, cultura: 'Soja', lat: -23.368, lng: -50.848 },
      { nome: 'Talhão B', area: 60, cultura: 'Milho', lat: -23.375, lng: -50.855 },
    ];
    const talhaoIds2 = [];
    for (const t of talhoes2) {
      const r = await client.query(`
        INSERT INTO talhoes (propriedade_id, nome, area_ha, cultura_atual, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, [propId2, t.nome, t.area, t.cultura, t.lat, t.lng]);
      talhaoIds2.push(r.rows[0].id);
    }
    console.log('✅ Talhões criados');

    // Análises de solo
    const analises = [
      { id: talhaoIds1[0], ph: 5.8, v: 52, p: 18, k: 0.35, ca: 3.2, mg: 1.1, mo: 3.2, ctc: 8.5, safra: '2024/2025', data: '2024-08-15' },
      { id: talhaoIds1[1], ph: 5.2, v: 38, p: 12, k: 0.28, ca: 2.1, mg: 0.8, mo: 2.8, ctc: 7.2, safra: '2024/2025', data: '2024-08-20' },
      { id: talhaoIds1[2], ph: 6.1, v: 65, p: 22, k: 0.45, ca: 4.1, mg: 1.4, mo: 3.8, ctc: 9.1, safra: '2024/2025', data: '2024-09-01' },
      { id: talhaoIds1[3], ph: 5.5, v: 48, p: 16, k: 0.32, ca: 2.8, mg: 1.0, mo: 3.0, ctc: 8.0, safra: '2024/2025', data: '2024-08-28' },
      { id: talhaoIds2[0], ph: 5.5, v: 45, p: 15, k: 0.31, ca: 2.8, mg: 1.0, mo: 3.0, ctc: 8.0, safra: '2024/2025', data: '2024-08-10' },
      { id: talhaoIds2[1], ph: 5.9, v: 55, p: 20, k: 0.40, ca: 3.5, mg: 1.2, mo: 3.5, ctc: 8.8, safra: '2024/2025', data: '2024-08-12' },
    ];
    const analiseIds = [];
    for (const a of analises) {
      const r = await client.query(`
        INSERT INTO analises_solo (talhao_id, safra, data_coleta, ph, saturacao_bases, fosforo, potassio, calcio, magnesio, materia_organica, ctc)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
      `, [a.id, a.safra, a.data, a.ph, a.v, a.p, a.k, a.ca, a.mg, a.mo, a.ctc]);
      analiseIds.push({ analise_id: r.rows[0].id, talhao_id: a.id });
    }
    console.log('✅ Análises de solo criadas');

    // Registros pluviométricos (safra 2024/2025)
    const chuvas = [
      // Talhão Norte
      [talhaoIds1[0], '2024-10-05', 28.5], [talhaoIds1[0], '2024-10-12', 45.2],
      [talhaoIds1[0], '2024-11-03', 62.1], [talhaoIds1[0], '2024-11-18', 38.7],
      [talhaoIds1[0], '2024-12-08', 55.3], [talhaoIds1[0], '2025-01-10', 72.4],
      [talhaoIds1[0], '2025-01-25', 48.6], [talhaoIds1[0], '2025-02-14', 81.2],
      // Talhão Sul
      [talhaoIds1[1], '2024-10-05', 31.2], [talhaoIds1[1], '2024-10-15', 52.4],
      [talhaoIds1[1], '2024-11-10', 41.8], [talhaoIds1[1], '2024-12-01', 67.3],
      [talhaoIds1[1], '2025-01-08', 58.9], [talhaoIds1[1], '2025-02-20', 74.1],
      // Talhão Leste
      [talhaoIds1[2], '2024-10-08', 25.6], [talhaoIds1[2], '2024-11-02', 48.9],
      [talhaoIds1[2], '2024-12-10', 71.2], [talhaoIds1[2], '2025-01-15', 63.5],
      [talhaoIds1[2], '2025-02-08', 42.1],
      // Talhão Oeste
      [talhaoIds1[3], '2024-10-07', 30.1], [talhaoIds1[3], '2024-11-05', 55.3],
      [talhaoIds1[3], '2024-12-12', 68.4], [talhaoIds1[3], '2025-01-20', 77.2],
      // Sítio Talhão A
      [talhaoIds2[0], '2024-10-10', 35.1], [talhaoIds2[0], '2024-11-05', 58.2],
      [talhaoIds2[0], '2024-12-05', 44.9], [talhaoIds2[0], '2025-01-12', 69.3],
      // Sítio Talhão B
      [talhaoIds2[1], '2024-10-12', 39.7], [talhaoIds2[1], '2024-11-20', 63.5],
      [talhaoIds2[1], '2024-12-15', 47.8], [talhaoIds2[1], '2025-01-28', 81.4],
    ];
    for (const [tid, data, mm] of chuvas) {
      await client.query(`
        INSERT INTO registros_chuva (talhao_id, safra, data_registro, precipitacao_mm)
        VALUES ($1,'2024/2025',$2,$3)
      `, [tid, data, mm]);
    }
    console.log('✅ Registros pluviométricos criados');

    // Ciclos de cultura com produtividade
    const ciclos = [
      [talhaoIds1[0], '2024/2025', 'Soja', '2024-10-15', '2025-02-28', 62],
      [talhaoIds1[1], '2024/2025', 'Milho', '2024-10-20', '2025-03-10', 185],
      [talhaoIds1[2], '2024/2025', 'Soja', '2024-10-18', '2025-03-05', 71],
      [talhaoIds1[3], '2024/2025', 'Soja', '2024-10-15', '2025-03-01', 58],
      [talhaoIds2[0], '2024/2025', 'Soja', '2024-10-22', '2025-03-08', 60],
      [talhaoIds2[1], '2024/2025', 'Milho', '2024-10-25', '2025-03-15', 178],
    ];
    for (const [tid, safra, cultura, plantio, colheita, prod] of ciclos) {
      await client.query(`
        INSERT INTO ciclos_cultura (talhao_id, safra, cultura, data_plantio, data_colheita, produtividade, unidade_produtividade)
        VALUES ($1,$2,$3,$4,$5,$6,'sc/ha')
      `, [tid, safra, cultura, plantio, colheita, prod]);
    }
    console.log('✅ Ciclos de cultura e produtividade criados');

    // Aplicações de insumos (calagem)
    await client.query(`
      INSERT INTO aplicacoes_insumos (talhao_id, safra, data_aplicacao, tipo_insumo, produto, dose, unidade_dose, area_aplicada, custo_total)
      VALUES ($1,'2024/2025','2024-09-10','Corretivo','Calcário Dolomítico',2.1,'t/ha',$2,4200.00)
    `, [talhaoIds1[1], talhoes1[1].area]);
    console.log('✅ Aplicações de insumos criadas');

    await client.end();
    console.log('\n🌾 Seed concluído com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Login: joao@agroanalytics.com');
    console.log('🔑 Senha: 123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Erro no seed:', err.message);
    process.exit(1);
  }
}

seed();
