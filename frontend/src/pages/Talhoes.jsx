import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { propriedadeService, talhaoService } from '../services/api';
import { Card, Modal, FormField, Loading, EmptyState, SectionHeader, Badge } from '../components/UI';
import { toast } from 'react-toastify';

const CULTURAS = ['Soja', 'Milho', 'Trigo', 'Café', 'Cana', 'Arroz', 'Feijão', 'Algodão'];

export default function Talhoes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [propriedades, setPropriedades] = useState([]);
  const [propSelecionada, setPropSelecionada] = useState(searchParams.get('propriedade') || '');
  const [talhoes, setTalhoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: '', area_ha: '', cultura_atual: 'Soja', latitude: '', longitude: '', observacoes: '' });

  useEffect(() => {
    propriedadeService.listar().then(r => {
      setPropriedades(r.data);
      if (!propSelecionada && r.data.length > 0) setPropSelecionada(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propSelecionada) { setLoading(false); return; }
    setLoading(true);
    propriedadeService.talhoes(propSelecionada).then(r => setTalhoes(r.data)).finally(() => setLoading(false));
  }, [propSelecionada]);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await talhaoService.criar({ ...form, propriedade_id: propSelecionada });
      toast.success('Talhão cadastrado!');
      setModal(false);
      setForm({ nome: '', area_ha: '', cultura_atual: 'Soja', latitude: '', longitude: '', observacoes: '' });
      propriedadeService.talhoes(propSelecionada).then(r => setTalhoes(r.data));
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao salvar.');
    } finally { setSalvando(false); }
  };

  const excluir = async (id, nome) => {
    if (!window.confirm(`Excluir o talhão "${nome}"?`)) return;
    try {
      await talhaoService.excluir(id);
      toast.success('Talhão removido.');
      setTalhoes(prev => prev.filter(t => t.id !== id));
    } catch (e) { toast.error(e.response?.data?.erro || 'Erro.'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const propAtual = propriedades.find(p => p.id === propSelecionada);
  const totalArea = talhoes.reduce((s, t) => s + parseFloat(t.area_ha || 0), 0);

  return (
    <div className="page">
      <SectionHeader
        titulo="🗺️ Talhões"
        subtitulo="Gerencie as subdivisões georreferenciadas de cada propriedade"
        acao={propSelecionada && <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo talhão</button>}
      />

      {/* Seletor de propriedade */}
      <div className="card mb-20">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>🏡 Propriedade:</label>
          <select className="form-select" style={{ maxWidth: 300 }} value={propSelecionada} onChange={e => setPropSelecionada(e.target.value)}>
            <option value="">Selecione...</option>
            {propriedades.map(p => <option key={p.id} value={p.id}>{p.nome} — {p.municipio}/{p.estado}</option>)}
          </select>
          {propAtual && (
            <span className="badge badge-verde">{parseFloat(propAtual.area_total || 0).toLocaleString('pt-BR')} ha total</span>
          )}
        </div>
      </div>

      {loading ? <Loading /> : !propSelecionada ? (
        <Card><EmptyState icone="🗺️" titulo="Selecione uma propriedade" descricao="Escolha uma propriedade acima para ver seus talhões." /></Card>
      ) : talhoes.length === 0 ? (
        <Card><EmptyState icone="🗺️" titulo="Nenhum talhão cadastrado"
          descricao={`Cadastre os talhões de ${propAtual?.nome || 'sua propriedade'}.`}
          acao={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Cadastrar primeiro talhão</button>} /></Card>
      ) : (
        <>
          {/* Métricas rápidas */}
          <div className="grid-4 mb-20">
            <div className="metric-card">
              <div className="metric-label">🗺️ Total de talhões</div>
              <div className="metric-value" style={{ color: 'var(--verde)' }}>{talhoes.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">📐 Área total mapeada</div>
              <div className="metric-value" style={{ color: 'var(--teal)' }}>{totalArea.toLocaleString('pt-BR')}<span className="metric-unit">ha</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">🫘 Talhões com soja</div>
              <div className="metric-value" style={{ color: 'var(--verde)' }}>{talhoes.filter(t => t.cultura_atual === 'Soja').length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">🌽 Talhões com milho</div>
              <div className="metric-value" style={{ color: 'var(--amarelo)' }}>{talhoes.filter(t => t.cultura_atual === 'Milho').length}</div>
            </div>
          </div>

          {/* Mapa visual proporcional */}
          <div className="card mb-20">
            <div className="card-header"><h3>📐 Distribuição proporcional dos talhões</h3></div>
            <div className="card-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {talhoes.map((t, i) => {
                  const pct = totalArea > 0 ? (parseFloat(t.area_ha) / totalArea) * 100 : 20;
                  const cores = [
                    ['var(--verde-claro)', 'var(--verde)', 'var(--verde-texto)'],
                    ['var(--teal-claro)', 'var(--teal)', '#085041'],
                    ['var(--amarelo-claro)', 'var(--amarelo)', '#633806'],
                    ['var(--azul-claro)', 'var(--azul)', 'var(--azul)'],
                    ['#f0e6ff', '#7c3aed', '#4c1d95'],
                  ];
                  const [bg, borda, texto] = cores[i % cores.length];
                  return (
                    <div key={t.id} style={{
                      background: bg, border: `2px solid ${borda}`, borderRadius: 10,
                      padding: '16px 18px', minWidth: 130,
                      flex: `0 0 calc(${Math.max(pct, 15)}% - 10px)`,
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      <div style={{ fontWeight: 600, color: texto, fontSize: 14 }}>{t.nome}</div>
                      <div style={{ fontSize: 12, color: borda }}>📐 {parseFloat(t.area_ha || 0).toLocaleString('pt-BR')} ha</div>
                      <div style={{ fontSize: 12, color: borda }}>
                        {t.cultura_atual === 'Soja' ? '🫘' : t.cultura_atual === 'Milho' ? '🌽' : '🌱'} {t.cultura_atual}
                      </div>
                      <div style={{ fontSize: 11, color: borda, opacity: 0.8 }}>{pct.toFixed(1)}% da área</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="card">
            <div className="card-header"><h3>📋 Lista de talhões</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nome</th><th>Área (ha)</th><th>Cultura</th>
                    <th>Localização</th><th>Análises</th><th>Registros chuva</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {talhoes.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.nome}</td>
                      <td>{parseFloat(t.area_ha || 0).toLocaleString('pt-BR')}</td>
                      <td>
                        <span className={`badge ${t.cultura_atual === 'Soja' ? 'badge-verde' : t.cultura_atual === 'Milho' ? 'badge-amarelo' : 'badge-cinza'}`}>
                          {t.cultura_atual || '—'}
                        </span>
                      </td>
                      <td className="text-sub text-sm">
                        {t.latitude && t.longitude ? `${parseFloat(t.latitude).toFixed(4)}, ${parseFloat(t.longitude).toFixed(4)}` : '—'}
                      </td>
                      <td>{t.total_analises > 0 ? <span className="badge badge-teal">{t.total_analises}</span> : <span className="badge badge-cinza">0</span>}</td>
                      <td>{t.total_registros_chuva > 0 ? <span className="badge badge-azul">{t.total_registros_chuva}</span> : <span className="badge badge-cinza">0</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/solo?talhao=${t.id}`)}>🧪 Solo</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/pluviometria?talhao=${t.id}`)}>🌧️ Chuva</button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => excluir(t.id, t.nome)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modal && (
        <Modal titulo="Cadastrar novo talhão" onFechar={() => setModal(false)}>
          <form onSubmit={salvar}>
            <div className="modal-body">
              <FormField label="Nome do talhão" required>
                <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="Ex: Talhão Norte" required />
              </FormField>
              <div className="form-grid-2">
                <FormField label="Área (ha)">
                  <input className="form-input" type="number" step="0.01" value={form.area_ha} onChange={set('area_ha')} placeholder="Ex: 85" />
                </FormField>
                <FormField label="Cultura atual">
                  <select className="form-select" value={form.cultura_atual} onChange={set('cultura_atual')}>
                    {CULTURAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="form-grid-2">
                <FormField label="Latitude (GPS)">
                  <input className="form-input" type="number" step="0.000001" value={form.latitude} onChange={set('latitude')} placeholder="-23.1050" />
                </FormField>
                <FormField label="Longitude (GPS)">
                  <input className="form-input" type="number" step="0.000001" value={form.longitude} onChange={set('longitude')} placeholder="-50.6480" />
                </FormField>
              </div>
              <FormField label="Observações">
                <textarea className="form-textarea" value={form.observacoes} onChange={set('observacoes')} placeholder="Informações adicionais sobre o talhão..." />
              </FormField>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? '⏳ Salvando...' : '✅ Cadastrar talhão'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
