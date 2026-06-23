import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { propriedadeService, chuvaService } from '../services/api';
import { Card, Modal, FormField, Loading, EmptyState, SectionHeader, MetricCard } from '../components/UI';
import { toast } from 'react-toastify';

export default function Pluviometria() {
  const [searchParams] = useSearchParams();
  const [propriedades, setPropriedades] = useState([]);
  const [talhoes, setTalhoes] = useState([]);
  const [propSel, setPropSel] = useState('');
  const [talhaoSel, setTalhaoSel] = useState(searchParams.get('talhao') || '');
  const [safra, setSafra] = useState('2024/2025');
  const [dados, setDados] = useState({ registros: [], metricas: {} });
  const [comparativo, setComparativo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [modalLote, setModalLote] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ data_registro: '', precipitacao_mm: '', fonte: 'manual', observacoes: '' });
  const [loteTexto, setLoteTexto] = useState('');

  useEffect(() => {
    propriedadeService.listar().then(r => {
      setPropriedades(r.data);
      if (!propSel && r.data.length > 0) setPropSel(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propSel) return;
    propriedadeService.talhoes(propSel).then(r => {
      setTalhoes(r.data);
      if (!talhaoSel && r.data.length > 0) setTalhaoSel(r.data[0].id);
    });
    chuvaService.comparativo({ propriedade_id: propSel, safra }).then(r => setComparativo(r.data));
  }, [propSel, safra]);

  useEffect(() => {
    if (!talhaoSel) return;
    setLoading(true);
    chuvaService.listar({ talhao_id: talhaoSel, safra }).then(r => setDados(r.data)).finally(() => setLoading(false));
  }, [talhaoSel, safra]);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await chuvaService.criar({ ...form, talhao_id: talhaoSel, safra });
      toast.success('Registro de chuva salvo!');
      setModal(false);
      setForm({ data_registro: '', precipitacao_mm: '', fonte: 'manual', observacoes: '' });
      chuvaService.listar({ talhao_id: talhaoSel, safra }).then(r => setDados(r.data));
      chuvaService.comparativo({ propriedade_id: propSel, safra }).then(r => setComparativo(r.data));
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao salvar.');
    } finally { setSalvando(false); }
  };

  const salvarLote = async () => {
    // Formato esperado: data,mm por linha. Ex: 2024-10-05,28.5
    const linhas = loteTexto.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const registros = linhas.map(l => {
      const [data, mm] = l.split(',');
      return { talhao_id: talhaoSel, safra, data_registro: data?.trim(), precipitacao_mm: parseFloat(mm), fonte: 'manual' };
    }).filter(r => r.data_registro && !isNaN(r.precipitacao_mm));
    if (!registros.length) { toast.error('Nenhum registro válido.'); return; }
    setSalvando(true);
    try {
      const r = await chuvaService.criarLote(registros);
      toast.success(`${r.data.inseridos} registros importados!`);
      setModalLote(false);
      setLoteTexto('');
      chuvaService.listar({ talhao_id: talhaoSel, safra }).then(r => setDados(r.data));
      chuvaService.comparativo({ propriedade_id: propSel, safra }).then(r => setComparativo(r.data));
    } catch (e) {
      toast.error('Erro ao importar lote.');
    } finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!window.confirm('Remover este registro?')) return;
    try {
      await chuvaService.excluir(id);
      toast.success('Registro removido.');
      chuvaService.listar({ talhao_id: talhaoSel, safra }).then(r => setDados(r.data));
      chuvaService.comparativo({ propriedade_id: propSel, safra }).then(r => setComparativo(r.data));
    } catch (e) { toast.error('Erro ao remover.'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Formatar data para mostrar apenas dia/mês
  const formatarDataGrafico = (dataStr) => {
    if (!dataStr) return '';
    // Se contiver 'T', extrai apenas a parte da data (YYYY-MM-DD)
    const dataParte = dataStr.includes('T') ? dataStr.split('T')[0] : dataStr;
    const [ano, mes, dia] = dataParte.split('-');
    return `${dia}/${mes}`;
  };

  // Dados acumulados para gráfico de linha
  const dadosAcumulado = dados.registros.reduce((acc, r, i) => {
    const prev = i > 0 ? acc[i - 1].acumulado : 0;
    acc.push({ data: formatarDataGrafico(r.data_registro), mm: parseFloat(r.precipitacao_mm), acumulado: parseFloat((prev + parseFloat(r.precipitacao_mm)).toFixed(1)) });
    return acc;
  }, []);

  const talhaoAtual = talhoes.find(t => t.id === talhaoSel);
  const propAtual = propriedades.find(p => p.id === propSel);

  return (
    <div className="page">
      <SectionHeader
        titulo="🌧️ Pluviometria"
        subtitulo="Registre e monitore a precipitação por talhão durante o ciclo da cultura"
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setModalLote(true)}>📥 Importar lote</button>
            {talhaoSel && <button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar chuva</button>}
          </div>
        }
      />

      {/* Filtros */}
      <div className="card mb-20">
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>🏡 Propriedade:</label>
            <select className="form-select" style={{ width: 220 }} value={propSel} onChange={e => { setPropSel(e.target.value); setTalhaoSel(''); }}>
              {propriedades.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>🗺️ Talhão:</label>
            <select className="form-select" style={{ width: 180 }} value={talhaoSel} onChange={e => setTalhaoSel(e.target.value)}>
              {talhoes.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>📅 Safra:</label>
            <select className="form-select" style={{ width: 130 }} value={safra} onChange={e => setSafra(e.target.value)}>
              {['2024/2025', '2023/2024', '2022/2023', '2021/2022'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Loading /> : !talhaoSel ? (
        <Card><EmptyState icone="🌧️" titulo="Selecione um talhão" /></Card>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid-4 mb-20">
            <MetricCard label="💧 Precipitação acumulada" value={dados.metricas.total_mm?.toLocaleString('pt-BR') ?? '0'} unit="mm" cor="azul" />
            <MetricCard label="🌧️ Total de eventos" value={dados.metricas.total_eventos ?? 0} cor="teal" />
            <MetricCard label="📊 Média por evento" value={dados.metricas.media_por_evento ?? '0'} unit="mm" cor="azul" />
            <MetricCard label="⬆️ Maior evento" value={dados.metricas.maior_evento_mm ?? '0'} unit="mm" cor="amarelo" />
          </div>

          <div className="grid-2 mb-20">
            {/* Gráfico de barras — eventos */}
            <div className="card">
              <div className="card-header"><h3>📊 Eventos de precipitação — {talhaoAtual?.nome}</h3></div>
              <div className="card-body">
                {dados.registros.length === 0 ? (
                  <EmptyState icone="🌧️" titulo="Nenhum registro" descricao="Clique em '+ Registrar chuva' para começar."
                    acao={<button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Registrar</button>} />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dadosAcumulado} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="mm" />
                      <Tooltip formatter={(v) => [`${v} mm`, 'Precipitação']} />
                      <Bar dataKey="mm" fill="#185FA5" radius={[4, 4, 0, 0]} name="Precipitação" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico de linha — acumulado */}
            <div className="card">
              <div className="card-header"><h3>📈 Acumulado da safra</h3></div>
              <div className="card-body">
                {dados.registros.length === 0 ? (
                  <EmptyState icone="📈" titulo="Sem dados" />
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--azul)' }}>{dados.metricas.total_mm}</span>
                      <span style={{ fontSize: 14, color: 'var(--texto-sub)', marginLeft: 6 }}>mm acumulados</span>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={dadosAcumulado} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="mm" />
                        <Tooltip formatter={(v) => [`${v} mm`, 'Acumulado']} />
                        <Line type="monotone" dataKey="acumulado" stroke="#1D9E75" strokeWidth={2} dot={false} name="Acumulado" />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Comparativo entre talhões */}
          {comparativo.length > 0 && (
            <div className="card mb-20">
              <div className="card-header"><h3>📊 Comparativo entre talhões — {propAtual?.nome} · safra {safra}</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {comparativo.map(t => {
                    const maxMm = Math.max(...comparativo.map(x => parseFloat(x.total_mm || 0)), 1);
                    const pct = (parseFloat(t.total_mm || 0) / maxMm) * 100;
                    const cultNecessaria = t.cultura_atual === 'Milho' ? 600 : 500;
                    const suficiencia = (parseFloat(t.total_mm || 0) / cultNecessaria) * 100;
                    const cor = suficiencia >= 80 ? 'var(--verde)' : suficiencia >= 60 ? 'var(--amarelo)' : 'var(--vermelho)';
                    return (
                      <div key={t.id} style={{
                        background: t.id === talhaoSel ? 'var(--azul-claro)' : 'var(--cinza-claro)',
                        borderRadius: 8, padding: '12px',
                        border: t.id === talhaoSel ? '1px solid var(--azul-borda)' : '1px solid var(--borda)',
                        cursor: 'pointer',
                      }} onClick={() => setTalhaoSel(t.id)}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t.nome}</div>
                        <div style={{ height: 6, background: 'var(--borda)', borderRadius: 3, marginBottom: 6 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 3 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--texto-sub)' }}>{t.cultura_atual}</span>
                          <strong style={{ color: 'var(--azul)' }}>{parseFloat(t.total_mm || 0).toFixed(0)} mm</strong>
                        </div>
                        <div style={{ fontSize: 11, color:cor, marginTop: 4 }}>
                          {suficiencia.toFixed(0)}% da necessidade hídrica
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: 'var(--texto-sub)', marginTop: 12 }}>
                  * Necessidade hídrica de referência: Soja ~500mm, Milho ~600mm por safra.
                </p>
              </div>
            </div>
          )}

          {/* Tabela de registros */}
          <div className="card">
            <div className="card-header">
              <h3>📋 Registros detalhados — {talhaoAtual?.nome}</h3>
              <span className="badge badge-azul">{dados.registros.length} eventos</span>
            </div>
            {dados.registros.length === 0 ? (
              <div className="card-body">
                <EmptyState icone="🌧️" titulo="Nenhum registro nesta safra"
                  acao={<button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Registrar chuva</button>} />
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tabela">
                  <thead>
                    <tr><th>Data</th><th>Precipitação</th><th>Acumulado</th><th>Fonte</th><th>Observações</th><th></th></tr>
                  </thead>
                  <tbody>
                    {dados.registros.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 500 }}>{r.data_registro?.slice(0, 10)}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--azul)', fontSize: 15 }}>{parseFloat(r.precipitacao_mm).toFixed(1)}</span>
                          <span style={{ color: 'var(--texto-sub)', fontSize: 12 }}> mm</span>
                        </td>
                        <td style={{ color: 'var(--teal)', fontWeight: 500 }}>
                          {dadosAcumulado[i]?.acumulado} mm
                        </td>
                        <td><span className="badge badge-cinza">{r.fonte}</span></td>
                        <td className="text-sub text-sm">{r.observacoes || '—'}</td>
                        <td>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => excluir(r.id)}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal registro individual */}
      {modal && (
        <Modal titulo="🌧️ Registrar precipitação" onFechar={() => setModal(false)}>
          <form onSubmit={salvar}>
            <div className="modal-body">
              <div className="form-grid-2">
                <FormField label="Data do registro" required>
                  <input className="form-input" type="date" value={form.data_registro} onChange={set('data_registro')} required />
                </FormField>
                <FormField label="Precipitação (mm)" required>
                  <input className="form-input" type="number" step="0.1" min="0" value={form.precipitacao_mm} onChange={set('precipitacao_mm')} placeholder="Ex: 35.5" required />
                </FormField>
              </div>
              <div className="form-grid-2">
                <FormField label="Fonte">
                  <select className="form-select" value={form.fonte} onChange={set('fonte')}>
                    <option value="manual">Manual (pluviômetro)</option>
                    <option value="estacao">Estação meteorológica</option>
                    <option value="inmet">INMET</option>
                    <option value="app">Aplicativo</option>
                  </select>
                </FormField>
                <FormField label="Safra">
                  <select className="form-select" value={safra} disabled>
                    <option>{safra}</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Observações">
                <textarea className="form-textarea" value={form.observacoes} onChange={set('observacoes')} placeholder="Ex: Chuva com granizo..." rows={2} />
              </FormField>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? '⏳...' : '✅ Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal importação em lote */}
      {modalLote && (
        <Modal titulo="📥 Importar registros em lote" onFechar={() => setModalLote(false)}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Talhão de destino</label>
              <select className="form-select" value={talhaoSel} onChange={e => setTalhaoSel(e.target.value)}>
                {talhoes.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="alerta alerta-amarelo" style={{ marginBottom: 12 }}>
              <div>
                <strong>Formato:</strong> uma linha por dia, separado por vírgula:<br />
                <code style={{ fontSize: 12 }}>AAAA-MM-DD,mm</code><br />
                <code style={{ fontSize: 12 }}>2024-10-05,28.5</code><br />
                <code style={{ fontSize: 12 }}>2024-10-12,45.2</code>
              </div>
            </div>
            <FormField label="Dados (data,mm por linha)">
              <textarea className="form-textarea" style={{ minHeight: 160, fontFamily: 'monospace', fontSize: 13 }}
                value={loteTexto} onChange={e => setLoteTexto(e.target.value)}
                placeholder={'2024-10-05,28.5\n2024-10-12,45.2\n2024-11-03,62.1'} />
            </FormField>
            <p className="text-sm text-sub">{loteTexto.trim().split('\n').filter(Boolean).length} linhas detectadas</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalLote(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarLote} disabled={salvando}>{salvando ? '⏳...' : '📥 Importar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
