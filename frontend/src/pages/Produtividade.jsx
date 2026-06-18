import { useState, useEffect } from 'react';
import { propriedadeService, cicloService, chuvaService, analiseService } from '../services/api';
import { Card, Modal, FormField, Loading, EmptyState, SectionHeader, MetricCard } from '../components/UI';
import { toast } from 'react-toastify';

const CULTURAS = ['Soja', 'Milho', 'Trigo', 'Café', 'Cana', 'Arroz', 'Feijão', 'Algodão'];
const MEDIA_REGIONAL = { Soja: 65, Milho: 180, Trigo: 55, Café: 30 };

export default function Produtividade() {
  const [propriedades, setPropriedades] = useState([]);
  const [propSel, setPropSel] = useState('');
  const [talhoes, setTalhoes] = useState([]);
  const [safra, setSafra] = useState('2024/2025');
  const [ciclos, setCiclos] = useState([]);
  const [correlacoes, setCorrelacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ talhao_id: '', safra: '2024/2025', cultura: 'Soja', data_plantio: '', data_colheita: '', produtividade: '', unidade_produtividade: 'sc/ha', observacoes: '' });

  useEffect(() => {
    propriedadeService.listar().then(r => {
      setPropriedades(r.data);
      if (!propSel && r.data.length > 0) setPropSel(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propSel) return;
    propriedadeService.talhoes(propSel).then(r => setTalhoes(r.data));
  }, [propSel]);

  const carregarCorrelacoes = async () => {
    if (!talhoes.length) { setCorrelacoes([]); return; }
    setLoading(true);
    const promessas = talhoes.map(async (t) => {
      const [analisesR, chuvaR, ciclosR] = await Promise.all([
        analiseService.listar(t.id),
        chuvaService.listar({ talhao_id: t.id, safra }),
        cicloService.listar({ talhao_id: t.id, safra }),
      ]);
      const analiseRecente = analisesR.data.filter(a => a.safra === safra)[0] || analisesR.data[0];
      return {
        talhao: t,
        analise: analiseRecente,
        chuva: chuvaR.data.metricas,
        ciclo: ciclosR.data[0] || null,
      };
    });
    const resultado = await Promise.all(promessas);
    setCorrelacoes(resultado);
    setLoading(false);
  };

  useEffect(() => { carregarCorrelacoes(); }, [talhoes, safra]);

  useEffect(() => {
    cicloService.listar({ safra }).then(r => setCiclos(r.data));
  }, [safra]);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await cicloService.criar(form);
      toast.success('Colheita registrada!');
      setModal(false);
      carregarCorrelacoes();
      cicloService.listar({ safra }).then(r => setCiclos(r.data));
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao salvar.');
    } finally { setSalvando(false); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const propAtual = propriedades.find(p => p.id === propSel);

  const comAnalise = correlacoes.filter(c => c.analise).length;
  const comColheita = correlacoes.filter(c => c.ciclo).length;
  const totalCalcarioNecessario = correlacoes.reduce((s, c) => {
    if (!c.analise) return s;
    const V2 = c.talhao.cultura_atual === 'Milho' ? 70 : 65;
    const nc = c.analise.saturacao_bases < V2 ? ((V2 - c.analise.saturacao_bases) * c.analise.ctc) / (10 * 0.8) : 0;
    return s + (nc * (c.talhao.area_ha || 0));
  }, 0);

  return (
    <div className="page">
      <SectionHeader
        titulo="🌾 Produtividade"
        subtitulo="Correlacione solo, chuva e resultado final da colheita"
        acao={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar colheita</button>}
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

      {loading ? <Loading /> : (
        <>
          {/* Métricas */}
          <div className="grid-4 mb-20">
            <MetricCard label="🗺️ Talhões na propriedade" value={talhoes.length} cor="teal" />
            <MetricCard label="🧪 Com análise de solo" value={comAnalise} cor="verde" />
            <MetricCard label="🌾 Com colheita registrada" value={comColheita} cor="amarelo" />
            <MetricCard label="⚗️ Calcário total necessário" value={totalCalcarioNecessario.toFixed(1)} unit="t" cor="vermelho" />
          </div>

          {/* Tabela de correlação */}
          {correlacoes.length > 0 && (
            <div className="card mb-20">
              <div className="card-header"><h3>🔗 Correlação Solo × Chuva × Produtividade — {propAtual?.nome}, safra {safra}</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Talhão</th><th>Cultura</th><th>pH</th><th>V%</th>
                      <th>Chuva acum.</th><th>Produtividade</th><th>Calagem</th><th>Avaliação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correlacoes.map(({ talhao, analise, chuva, ciclo }) => {
                      const cultura = ciclo?.cultura || talhao.cultura_atual;
                      const mediaRef = MEDIA_REGIONAL[cultura] || 50;
                      const prod = ciclo?.produtividade ? parseFloat(ciclo.produtividade) : null;
                      let avaliacao = null, corAval = 'cinza';
                      if (prod) {
                        if (prod >= mediaRef) { avaliacao = 'Acima da média'; corAval = 'verde'; }
                        else if (prod >= mediaRef * 0.85) { avaliacao = 'Na média'; corAval = 'amarelo'; }
                        else { avaliacao = 'Abaixo da média'; corAval = 'vermelho'; }
                      }
                      const V2 = cultura === 'Milho' ? 70 : 65;
                      const nc = analise && analise.saturacao_bases < V2
                        ? Math.round(((V2 - analise.saturacao_bases) * analise.ctc / 8) * 100) / 100 : 0;
                      return (
                        <tr key={talhao.id}>
                          <td style={{ fontWeight: 500 }}>{talhao.nome}</td>
                          <td><span className="badge badge-cinza">{cultura}</span></td>
                          <td>{analise?.ph ?? '—'}</td>
                          <td>{analise?.saturacao_bases ? `${analise.saturacao_bases}%` : '—'}</td>
                          <td style={{ color: 'var(--azul)', fontWeight: 500 }}>{chuva?.total_mm?.toFixed(0) ?? 0} mm</td>
                          <td style={{ fontWeight: 600 }}>{prod ? `${prod} ${ciclo.unidade_produtividade}` : '—'}</td>
                          <td>{nc > 0 ? <span className="badge badge-amarelo">{nc} t/ha</span> : analise ? <span className="badge badge-verde">OK</span> : '—'}</td>
                          <td>{avaliacao ? <span className={`badge badge-${corAval}`}>{avaliacao}</span> : <span className="badge badge-cinza">Sem colheita</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards por talhão */}
          <div className="grid-3">
            {correlacoes.length === 0 ? (
              <Card><EmptyState icone="🌾" titulo="Nenhum talhão nesta propriedade" /></Card>
            ) : correlacoes.map(({ talhao, analise, chuva, ciclo }) => (
              <div key={talhao.id} className="card">
                <div className="card-header">
                  <div>
                    <h3 style={{ fontSize: 14 }}>{talhao.nome}</h3>
                    <p className="text-sub text-sm">{parseFloat(talhao.area_ha || 0).toLocaleString('pt-BR')} ha · {talhao.cultura_atual}</p>
                  </div>
                  {ciclo ? <span className="badge badge-verde">✓ Colhido</span> : <span className="badge badge-cinza">Pendente</span>}
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: ciclo ? 12 : 0 }}>
                    <div style={{ textAlign: 'center', padding: '6px', background: 'var(--cinza-claro)', borderRadius: 6 }}>
                      <div className="text-sm text-sub">pH</div>
                      <div style={{ fontWeight: 600 }}>{analise?.ph ?? '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px', background: 'var(--azul-claro)', borderRadius: 6 }}>
                      <div className="text-sm" style={{ color: 'var(--azul)' }}>Chuva</div>
                      <div style={{ fontWeight: 600, color: 'var(--azul)' }}>{chuva?.total_mm?.toFixed(0) ?? 0}mm</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px', background: 'var(--verde-claro)', borderRadius: 6 }}>
                      <div className="text-sm" style={{ color: 'var(--verde-texto)' }}>V%</div>
                      <div style={{ fontWeight: 600, color: 'var(--verde)' }}>{analise?.saturacao_bases ?? '—'}{analise?.saturacao_bases ? '%' : ''}</div>
                    </div>
                  </div>
                  {ciclo && (
                    <div style={{ background: 'var(--verde-claro)', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                      <div className="text-sm" style={{ color: 'var(--verde-texto)' }}>Produtividade final</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--verde)' }}>{ciclo.produtividade}</div>
                      <div className="text-sm" style={{ color: 'var(--verde-texto)' }}>{ciclo.unidade_produtividade}</div>
                    </div>
                  )}
                  {!ciclo && (
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                      onClick={() => { setForm(f => ({ ...f, talhao_id: talhao.id, cultura: talhao.cultura_atual, safra })); setModal(true); }}>
                      + Registrar colheita
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modal && (
        <Modal titulo="🌾 Registrar resultado da colheita" onFechar={() => setModal(false)}>
          <form onSubmit={salvar}>
            <div className="modal-body">
              <FormField label="Talhão" required>
                <select className="form-select" value={form.talhao_id} onChange={set('talhao_id')} required>
                  <option value="">Selecione...</option>
                  {talhoes.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </FormField>
              <div className="form-grid-2">
                <FormField label="Safra" required>
                  <select className="form-select" value={form.safra} onChange={set('safra')}>
                    {['2024/2025', '2023/2024', '2022/2023'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Cultura" required>
                  <select className="form-select" value={form.cultura} onChange={set('cultura')}>
                    {CULTURAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="form-grid-2">
                <FormField label="Data do plantio">
                  <input className="form-input" type="date" value={form.data_plantio} onChange={set('data_plantio')} />
                </FormField>
                <FormField label="Data da colheita">
                  <input className="form-input" type="date" value={form.data_colheita} onChange={set('data_colheita')} />
                </FormField>
              </div>
              <div className="form-grid-2">
                <FormField label="Produtividade" required>
                  <input className="form-input" type="number" step="0.1" value={form.produtividade} onChange={set('produtividade')} placeholder="Ex: 65" required />
                </FormField>
                <FormField label="Unidade">
                  <select className="form-select" value={form.unidade_produtividade} onChange={set('unidade_produtividade')}>
                    <option value="sc/ha">sacas/ha (sc/ha)</option>
                    <option value="kg/ha">kg/ha</option>
                    <option value="t/ha">toneladas/ha</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Observações">
                <textarea className="form-textarea" value={form.observacoes} onChange={set('observacoes')} placeholder="Condições da colheita, problemas observados..." />
              </FormField>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? '⏳...' : '✅ Registrar colheita'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
