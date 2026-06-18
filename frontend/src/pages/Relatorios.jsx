import { useState, useEffect } from 'react';
import { propriedadeService, relatorioService } from '../services/api';
import { Card, Loading, EmptyState, SectionHeader, MetricCard } from '../components/UI';
import { toast } from 'react-toastify';

export default function Relatorios() {
  const [propriedades, setPropriedades] = useState([]);
  const [propSel, setPropSel] = useState('');
  const [safra, setSafra] = useState('2024/2025');
  const [tipo, setTipo] = useState('completo');
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    propriedadeService.listar().then(r => {
      setPropriedades(r.data);
      if (!propSel && r.data.length > 0) setPropSel(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propSel) return;
    setLoading(true);
    relatorioService.completo({ propriedade_id: propSel, safra })
      .then(r => setRelatorio(r.data))
      .catch(() => toast.error('Erro ao gerar relatório.'))
      .finally(() => setLoading(false));
  }, [propSel, safra]);

  const imprimir = () => window.print();

  const exportarCSV = () => {
    if (!relatorio) return;
    const linhas = [['Talhão', 'Área (ha)', 'Cultura', 'pH', 'V%', 'CTC', 'Calagem (t/ha)', 'Chuva acum. (mm)', 'Produtividade']];
    relatorio.talhoes.forEach(t => {
      linhas.push([
        t.talhao.nome, t.talhao.area_ha, t.talhao.cultura_atual,
        t.analise_solo?.ph ?? '', t.analise_solo?.saturacao_bases ?? '', t.analise_solo?.ctc ?? '',
        t.calagem?.necessidade_calcario ?? '', t.pluviometria.total_mm,
        t.ciclo_cultura ? `${t.ciclo_cultura.produtividade} ${t.ciclo_cultura.unidade_produtividade}` : '',
      ]);
    });
    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio_${relatorio.propriedade.nome.replace(/\s/g, '_')}_${safra.replace('/', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const propAtual = propriedades.find(p => p.id === propSel);

  return (
    <div className="page">
      <SectionHeader
        titulo="📋 Relatórios Analíticos"
        subtitulo="Relatórios integrados de solo, pluviometria e produtividade"
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={exportarCSV} disabled={!relatorio}>📥 Exportar CSV</button>
            <button className="btn btn-primary" onClick={imprimir} disabled={!relatorio}>🖨️ Imprimir/PDF</button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="card mb-20">
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 13 }}>🏡 Propriedade:</label>
            <select className="form-select" style={{ width: 220 }} value={propSel} onChange={e => setPropSel(e.target.value)}>
              {propriedades.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 13 }}>📅 Safra:</label>
            <select className="form-select" style={{ width: 130 }} value={safra} onChange={e => setSafra(e.target.value)}>
              {['2024/2025', '2023/2024', '2022/2023'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="tabs">
        {[['completo', '📊 Completo'], ['solo', '🧪 Solo e calagem'], ['hidrico', '🌧️ Balanço hídrico'], ['produtividade', '🌾 Produtividade']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${tipo === id ? 'ativo' : ''}`} onClick={() => setTipo(id)}>{label}</button>
        ))}
      </div>

      {loading ? <Loading /> : !relatorio ? (
        <Card><EmptyState icone="📋" titulo="Selecione uma propriedade" /></Card>
      ) : (
        <>
          {/* Cabeçalho do relatório */}
          <div className="card mb-20" style={{ borderLeft: '4px solid var(--verde)' }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--verde)' }}>📄 Relatório de Gestão Agrícola — {relatorio.propriedade.nome}</div>
                <div className="text-sub text-sm">
                  Safra {relatorio.safra} · Gerado em {new Date(relatorio.gerado_em).toLocaleString('pt-BR')} · {relatorio.resumo.total_talhoes} talhões
                </div>
              </div>
              <span className="badge badge-verde">✓ Dados verificados</span>
            </div>
          </div>

          {/* Resumo executivo */}
          {(tipo === 'completo' || tipo === 'produtividade') && (
            <div className="grid-4 mb-20">
              <MetricCard label="🫘 Média Soja" value={relatorio.resumo.media_produtividade_soja ?? '—'} unit="sc/ha" cor="verde" />
              <MetricCard label="🌽 Média Milho" value={relatorio.resumo.media_produtividade_milho ?? '—'} unit="sc/ha" cor="amarelo" />
              <MetricCard label="📐 Área total" value={relatorio.resumo.total_area_ha} unit="ha" cor="teal" />
              <MetricCard label="🌧️ Chuva média" value={relatorio.resumo.total_chuva_media} unit="mm" cor="azul" />
            </div>
          )}

          {/* Solo e calagem */}
          {(tipo === 'completo' || tipo === 'solo') && (
            <div className="card mb-20">
              <div className="card-header">
                <h3>🧪 Análise de solo e recomendação de calagem</h3>
                <span className="badge badge-amarelo">{relatorio.resumo.talhoes_precisam_calagem} talhões precisam correção</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Talhão</th><th>Data análise</th><th>pH</th><th>V%</th><th>P</th><th>K</th><th>CTC</th>
                      <th>Calagem (t/ha)</th><th>Total propriedade</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.talhoes.map(t => (
                      <tr key={t.talhao.id}>
                        <td style={{ fontWeight: 500 }}>{t.talhao.nome}</td>
                        <td className="text-sub">{t.analise_solo?.data_coleta?.slice(0, 10) ?? '—'}</td>
                        <td>{t.analise_solo?.ph ?? '—'}</td>
                        <td>{t.analise_solo?.saturacao_bases ? `${t.analise_solo.saturacao_bases}%` : '—'}</td>
                        <td>{t.analise_solo?.fosforo ?? '—'}</td>
                        <td>{t.analise_solo?.potassio ?? '—'}</td>
                        <td>{t.analise_solo?.ctc ?? '—'}</td>
                        <td style={{ fontWeight: 600, color: t.calagem?.necessidade_calcario > 0 ? 'var(--amarelo)' : 'var(--verde)' }}>
                          {t.calagem ? t.calagem.necessidade_calcario : '—'}
                        </td>
                        <td>{t.calagem?.total_propriedade ? `${t.calagem.total_propriedade.toFixed(1)} t` : '—'}</td>
                        <td>
                          {!t.analise_solo ? <span className="badge badge-cinza">Sem laudo</span> :
                            t.calagem?.necessidade_calcario === 0 ? <span className="badge badge-verde">OK</span> :
                            <span className="badge badge-amarelo">Corrigir</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {relatorio.resumo.total_calcario_necessario > 0 && (
                <div className="card-body" style={{ borderTop: '1px solid var(--borda)' }}>
                  <strong>Total de calcário necessário na propriedade: </strong>
                  <span style={{ color: 'var(--amarelo)', fontWeight: 700 }}>{relatorio.resumo.total_calcario_necessario.toFixed(1)} toneladas</span>
                </div>
              )}
            </div>
          )}

          {/* Balanço hídrico */}
          {(tipo === 'completo' || tipo === 'hidrico') && (
            <div className="card mb-20">
              <div className="card-header"><h3>🌧️ Balanço hídrico por talhão</h3></div>
              <div className="card-body">
                <div className="grid-auto">
                  {relatorio.talhoes.map(t => {
                    const necessaria = t.talhao.cultura_atual === 'Milho' ? 600 : 500;
                    const pct = Math.min((t.pluviometria.total_mm / necessaria) * 100, 100);
                    const cor = pct >= 80 ? 'var(--verde)' : pct >= 60 ? 'var(--amarelo)' : 'var(--vermelho)';
                    return (
                      <div key={t.talhao.id} style={{ background: 'var(--cinza-claro)', borderRadius: 8, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{t.talhao.nome}</span>
                          <span style={{ fontSize: 11, color: cor }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="progress-bar" style={{ marginBottom: 8 }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, background: cor }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--texto-sub)' }}>
                          <span>Acumulado: <strong style={{ color: 'var(--azul)' }}>{t.pluviometria.total_mm.toFixed(0)} mm</strong></span>
                          <span>Ideal: {necessaria} mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Produtividade detalhada */}
          {(tipo === 'completo' || tipo === 'produtividade') && (
            <div className="card">
              <div className="card-header"><h3>🌾 Relatório de produtividade e correlações</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {relatorio.talhoes.map(t => {
                  if (!t.ciclo_cultura) {
                    return (
                      <div key={t.talhao.id} style={{ padding: 12, background: 'var(--cinza-claro)', borderRadius: 8, fontSize: 13, color: 'var(--texto-sub)' }}>
                        <strong style={{ color: 'var(--texto)' }}>{t.talhao.nome}</strong> — colheita não registrada para a safra {safra}
                      </div>
                    );
                  }
                  const mediaRef = t.ciclo_cultura.cultura === 'Milho' ? 180 : 65;
                  const diff = parseFloat(t.ciclo_cultura.produtividade) - mediaRef;
                  return (
                    <div key={t.talhao.id} style={{ padding: 14, background: 'var(--cinza-claro)', borderRadius: 8, border: '1px solid var(--borda)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.talhao.nome}</div>
                          <div className="text-sub text-sm">{t.talhao.area_ha} ha · {t.ciclo_cultura.cultura} · safra {safra}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--verde)' }}>{t.ciclo_cultura.produtividade} <span style={{ fontSize: 13 }}>{t.ciclo_cultura.unidade_produtividade}</span></div>
                          <div style={{ fontSize: 12, color: diff >= 0 ? 'var(--verde)' : 'var(--vermelho)' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)} vs. média regional</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        <div style={{ background: 'white', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                          <div className="text-sm text-sub">pH</div><div style={{ fontWeight: 600 }}>{t.analise_solo?.ph ?? '—'}</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                          <div className="text-sm text-sub">V%</div><div style={{ fontWeight: 600 }}>{t.analise_solo?.saturacao_bases ? `${t.analise_solo.saturacao_bases}%` : '—'}</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                          <div className="text-sm text-sub">Chuva</div><div style={{ fontWeight: 600, color: 'var(--azul)' }}>{t.pluviometria.total_mm.toFixed(0)}mm</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                          <div className="text-sm text-sub">Calagem</div>
                          <div style={{ fontWeight: 600, color: t.calagem?.necessidade_calcario > 0 ? 'var(--amarelo)' : 'var(--verde)' }}>
                            {t.calagem?.necessidade_calcario > 0 ? `${t.calagem.necessidade_calcario}t/ha` : 'OK'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
