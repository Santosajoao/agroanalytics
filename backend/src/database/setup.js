require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Client } = require('pg');

async function setup() {
  // Conecta ao postgres padrão para criar o banco
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('🔌 Conectado ao PostgreSQL...');

    // Cria o banco se não existir
    const dbName = process.env.DB_NAME || 'agroanalytics';
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (checkDb.rows.length === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Banco de dados '${dbName}' criado!`);
    } else {
      console.log(`ℹ️  Banco de dados '${dbName}' já existe.`);
    }
    await client.end();

    // Conecta ao banco criado
    const appClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    await appClient.connect();

    // Habilita extensões
    await appClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    console.log('✅ Extensão uuid-ossp habilitada');

    // Tenta habilitar PostGIS (opcional)
    try {
      await appClient.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
      console.log('✅ Extensão PostGIS habilitada');
    } catch (e) {
      console.log('⚠️  PostGIS não disponível. Usando armazenamento JSON para geometrias.');
    }

    // ===================== TABELAS =====================

    // Usuários (produtores rurais)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        telefone VARCHAR(20),
        tipo VARCHAR(20) DEFAULT 'produtor' CHECK (tipo IN ('produtor', 'tecnico', 'admin')),
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela usuarios');

    // Propriedades rurais
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS propriedades (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(150) NOT NULL,
        area_total NUMERIC(10,2),
        municipio VARCHAR(100),
        estado VARCHAR(2) DEFAULT 'PR',
        cep VARCHAR(9),
        latitude NUMERIC(10,7),
        longitude NUMERIC(10,7),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela propriedades');

    // Talhões (subdivisions georreferenciadas)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS talhoes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        propriedade_id UUID NOT NULL REFERENCES propriedades(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        area_ha NUMERIC(10,2),
        cultura_atual VARCHAR(80),
        latitude NUMERIC(10,7),
        longitude NUMERIC(10,7),
        geometria_json JSONB,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela talhoes');

    // Ciclos de cultura (safras por talhão)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS ciclos_cultura (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
        safra VARCHAR(10) NOT NULL,
        cultura VARCHAR(80) NOT NULL,
        data_plantio DATE,
        data_colheita DATE,
        produtividade NUMERIC(10,2),
        unidade_produtividade VARCHAR(20) DEFAULT 'sc/ha',
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela ciclos_cultura');

    // Análises de solo
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS analises_solo (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
        safra VARCHAR(10),
        data_coleta DATE NOT NULL,
        laboratorio VARCHAR(100),
        ph NUMERIC(4,2),
        saturacao_bases NUMERIC(5,2),
        fosforo NUMERIC(8,2),
        potassio NUMERIC(8,3),
        calcio NUMERIC(8,2),
        magnesio NUMERIC(8,2),
        materia_organica NUMERIC(6,2),
        ctc NUMERIC(8,2),
        aluminio NUMERIC(6,2),
        enxofre NUMERIC(6,2),
        boro NUMERIC(6,3),
        cobre NUMERIC(6,3),
        ferro NUMERIC(8,2),
        manganes NUMERIC(6,2),
        zinco NUMERIC(6,3),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela analises_solo');

    // Recomendações de calagem calculadas
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS recomendacoes_calagem (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        analise_id UUID NOT NULL REFERENCES analises_solo(id) ON DELETE CASCADE,
        talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
        cultura VARCHAR(80),
        saturacao_bases_desejada NUMERIC(5,2),
        necessidade_calcario NUMERIC(8,2),
        prnt NUMERIC(5,2) DEFAULT 80,
        total_calcario_propriedade NUMERIC(10,2),
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela recomendacoes_calagem');

    // Registros pluviométricos
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS registros_chuva (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
        safra VARCHAR(10),
        data_registro DATE NOT NULL,
        precipitacao_mm NUMERIC(7,2) NOT NULL,
        fonte VARCHAR(50) DEFAULT 'manual',
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela registros_chuva');

    // Aplicação de insumos
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS aplicacoes_insumos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
        safra VARCHAR(10),
        data_aplicacao DATE NOT NULL,
        tipo_insumo VARCHAR(80) NOT NULL,
        produto VARCHAR(150),
        dose NUMERIC(10,3),
        unidade_dose VARCHAR(20),
        area_aplicada NUMERIC(10,2),
        custo_total NUMERIC(10,2),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela aplicacoes_insumos');

    // Índices para performance
    await appClient.query(`CREATE INDEX IF NOT EXISTS idx_talhoes_propriedade ON talhoes(propriedade_id)`);
    await appClient.query(`CREATE INDEX IF NOT EXISTS idx_analises_talhao ON analises_solo(talhao_id)`);
    await appClient.query(`CREATE INDEX IF NOT EXISTS idx_chuva_talhao ON registros_chuva(talhao_id)`);
    await appClient.query(`CREATE INDEX IF NOT EXISTS idx_chuva_data ON registros_chuva(data_registro)`);
    await appClient.query(`CREATE INDEX IF NOT EXISTS idx_ciclos_talhao ON ciclos_cultura(talhao_id)`);
    await appClient.query(`CREATE INDEX IF NOT EXISTS idx_ciclos_safra ON ciclos_cultura(safra)`);
    console.log('✅ Índices criados');

    await appClient.end();
    console.log('\n🚀 Banco de dados configurado com sucesso!');
    console.log('👉 Execute agora: npm run db:seed  (para dados de exemplo)');
  } catch (err) {
    console.error('❌ Erro ao configurar banco:', err.message);
    process.exit(1);
  }
}

setup();
