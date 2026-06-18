import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propriedadeService } from '../services/api';
import { Card, MetricCard, Modal, FormField, Loading, EmptyState, SectionHeader, Badge } from '../components/UI';
import { toast } from 'react-toastify';

export default function Propriedades() {
  const [propriedades, setPropriedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: '', area_total: '', municipio: '', estado: 'PR', cep: '', latitude: '', longitude: '', observacoes: '' });
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  const carregar = () => {
    setLoading(true);
    propriedadeService.listar().then(r => setPropriedades(r.data)).finally(() => setLoading(false));
  };
  useEffect(carregar, []);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await propriedadeService.criar(form);
      toast.success('Propriedade cadastrada!');
      setModal(false);
      setForm({ nome: '', area_total: '', municipio: '', estado: 'PR', cep: '', latitude: '', longitude: '', observacoes: '' });
      carregar();
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao salvar.');
    } finally { setSalvando(false); }
  };

  const excluir = async (id, nome) => {
    if (!window.confirm(`Excluir a propriedade "${nome}"? Isso removerá todos os talhões e dados associados.`)) return;
    try {
      await propriedadeService.excluir(id);
      toast.success('Propriedade removida.');
      carregar();
    } catch (e) { toast.error(e.response?.data?.erro || 'Erro ao excluir.'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const totalArea = propriedades.reduce((s, p) => s + parseFloat(p.area_total || 0), 0);

  if (loading) return <div className="page"><Loading /></div>;

  return (
    <div className="page">
      <SectionHeader
        titulo="🏡 Propriedades"
        subtitulo="Gerencie suas fazendas e sítios"
        acao={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Nova propriedade</button>}
      />

      <div className="grid-4 mb-24">
        <MetricCard label="Total de propriedades" value={propriedades.length} cor="verde" />
        <MetricCard label="Área total" value={totalArea.toLocaleString('pt-BR')} unit="ha" cor="teal" />
        <MetricCard label="Total de talhões" value={propriedades.reduce((s, p) => s + (p.total_talhoes || 0), 0)} cor="azul" />
        <MetricCard label="Estados" value={[...new Set(propriedades.map(p => p.estado))].join(', ') || '—'} cor="verde" />
      </div>

      {propriedades.length === 0 ? (
        <Card><EmptyState icone="🏡" titulo="Nenhuma propriedade cadastrada" descricao="Comece cadastrando sua primeira propriedade rural."
          acao={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Cadastrar propriedade</button>} /></Card>
      ) : (
        <div className="grid-2">
          {propriedades.map(p => (
            <div key={p.id} className="card">
              <div className="card-header">
                <div>
                  <h3>{p.nome}</h3>
                  <p className="text-sub text-sm">{p.municipio} — {p.estado}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/talhoes?propriedade=${p.id}`)}>Ver talhões →</button>
                  <button className="btn btn-danger btn-sm" onClick={() => excluir(p.id, p.nome)}>🗑</button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'var(--cinza-claro)', borderRadius: 8 }}>
                    <div className="text-sm text-sub">Área total</div>
                    <div style={{ fontWeight: 600, color: 'var(--verde)' }}>{parseFloat(p.area_total || 0).toLocaleString('pt-BR')} ha</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'var(--cinza-claro)', borderRadius: 8 }}>
                    <div className="text-sm text-sub">Talhões</div>
                    <div style={{ fontWeight: 600, color: 'var(--teal)' }}>{p.total_talhoes || 0}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'var(--cinza-claro)', borderRadius: 8 }}>
                    <div className="text-sm text-sub">Estado</div>
                    <div style={{ fontWeight: 600 }}>{p.estado}</div>
                  </div>
                </div>
                {(p.latitude && p.longitude) && (
                  <p className="text-sm text-sub">📍 {parseFloat(p.latitude).toFixed(4)}, {parseFloat(p.longitude).toFixed(4)}</p>
                )}
                {p.observacoes && <p className="text-sm text-sub" style={{ marginTop: 8 }}>📝 {p.observacoes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal titulo="Cadastrar nova propriedade" onFechar={() => setModal(false)}>
          <form onSubmit={salvar}>
            <div className="modal-body">
              <FormField label="Nome da propriedade" required>
                <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="Ex: Fazenda São João" required />
              </FormField>
              <div className="form-grid-2">
                <FormField label="Área total (ha)">
                  <input className="form-input" type="number" step="0.01" value={form.area_total} onChange={set('area_total')} placeholder="Ex: 350" />
                </FormField>
                <FormField label="Estado">
                  <select className="form-select" value={form.estado} onChange={set('estado')}>
                    {['PR','SP','MG','MT','MS','GO','BA','RS','SC','TO','MA','PI','RO','PA'].map(e => <option key={e}>{e}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="form-grid-2">
                <FormField label="Município">
                  <input className="form-input" value={form.municipio} onChange={set('municipio')} placeholder="Ex: Cornélio Procópio" />
                </FormField>
                <FormField label="CEP">
                  <input className="form-input" value={form.cep} onChange={set('cep')} placeholder="86300-000" />
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
                <textarea className="form-textarea" value={form.observacoes} onChange={set('observacoes')} placeholder="Informações adicionais..." />
              </FormField>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? '⏳ Salvando...' : '✅ Cadastrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
