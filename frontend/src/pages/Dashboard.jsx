import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { relatorioService, cicloService } from '../services/api';
import { MetricCard, Card, Loading, Alerta } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      relatorioService.dashboard(),
      cicloService.listar({ safra: '2024/2025' }),
    ]).then(([dash, cc]) => {
      setDados(dash.data);
      setCiclos(cc.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><Loading /></div>;

  const mediaSoja = dados?.produtividade_media?.find(p => p.cultura === 'Soja')?.media;
  const mediaMilho = dados?.produtividade_media?.find(p => p.cultura === 'Milho')?.media;

  const dadosGrafico = ciclos.map(c => ({
    nome: c.talhao_nome?.replace('Talhão ', 'T. '),
    produtividade: parseFloat(c.produtividade || 0),
    cultura: c.cultura,
  }));

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nomeFirst = usuario?.nome?.split(' ')[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{saudacao}, {nomeFirst}! 👋</h1>
          <p className="page-sub">Safra 2024/2025 — visão geral da sua operação</p>
        </div>
      </div>

      {/* Alertas */}
      {dados?.alertas_solo?.length > 0 && (
        <div className="mb-20">
          {dados.alertas_solo.map((a, i) => (
            <Alerta key={i} tipo="amarelo" icone="⚠️">
              <strong>{a.talhao}</strong> ({a.propriedade}) — V% = {a.saturacao_bases}% | Necessita correção de solo.{' '}
              <button className="btn btn-sm" style={{ marginLeft: 8, padding: '2px 10px' }} onClick={() => navigate('/solo')}>Ver análise →</button>
            </Alerta>
          ))}
        </div>
      )}

      {/* Métricas */}
      <div className="grid-4 mb-24">
        <MetricCard label="🏡 Propriedades" value={dados?.total_propriedades} cor="verde" />
        <MetricCard label="🗺️ Talhões cadastrados" value={dados?.total_talhoes} cor="teal" />
        <MetricCard label="📐 Área total" value={dados?.area_total ? parseFloat(dados.area_total).toLocaleString('pt-BR') : '—'} unit="ha" cor="verde" />
        <MetricCard label="🧪 Análises de solo" value={dados?.total_analises} cor="azul" />
      </div>

      <div className="grid-2 mb-20">
        {/* Produtividade */}
        <div className="card">
          <div className="card-header">
            <h3>🌾 Produtividade por talhão — 2024/2025</h3>
          </div>
          <div className="card-body">
            {dadosGrafico.length > 0 ? (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  {mediaSoja && <span className="badge badge-verde">Soja média: {mediaSoja} sc/ha</span>}
                  {mediaMilho && <span className="badge badge-amarelo">Milho média: {mediaMilho} sc/ha</span>}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosGrafico} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} sc/ha`, 'Produtividade']} />
                    <Bar dataKey="produtividade" fill="#3B6D11" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-icon">📊</div>
                <p>Nenhuma colheita registrada.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/produtividade')}>Registrar colheita</button>
              </div>
            )}
          </div>
        </div>

        {/* Resumo rápido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-header"><h3>📈 Médias de produtividade</h3></div>
            <div className="card-body">
              {dados?.produtividade_media?.length > 0 ? dados.produtividade_media.map(p => (
                <div key={p.cultura} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
                  <span style={{ fontWeight: 500 }}>{p.cultura === 'Soja' ? '🫘' : '🌽'} {p.cultura}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--verde)' }}>{p.media} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--texto-sub)' }}>sc/ha</span></div>
                    <div style={{ fontSize: 11, color: 'var(--texto-sub)' }}>média geral</div>
                  </div>
                </div>
              )) : <p className="text-sub">Sem dados de produtividade.</p>}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>🚀 Acesso rápido</h3></div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '+ Análise de solo', path: '/solo', icone: '🧪' },
                { label: '+ Registro de chuva', path: '/pluviometria', icone: '🌧️' },
                { label: '+ Propriedade', path: '/propriedades', icone: '🏡' },
                { label: 'Ver relatório', path: '/relatorios', icone: '📋' },
              ].map(item => (
                <button key={item.path} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate(item.path)}>
                  {item.icone} {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé info */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--texto-sub)' }}>
          <span>🌱</span>
          <span>AgroAnalytics v1.0 · Desenvolvido por João Pedro Santos de Araújo · TCC Engenharia de Software — UTFPR Cornélio Procópio, 2025</span>
        </div>
      </div>
    </div>
  );
}
