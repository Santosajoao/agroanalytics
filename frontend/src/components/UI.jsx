// Componentes reutilizáveis do AgroAnalytics

export function Badge({ tipo = 'cinza', children }) {
  return <span className={`badge badge-${tipo}`}>{children}</span>;
}

export function StatusSolo({ v, nc }) {
  if (nc === undefined) return <Badge tipo="cinza">Sem análise</Badge>;
  if (nc === 0) return <Badge tipo="verde">✓ Solo adequado</Badge>;
  if (nc > 3) return <Badge tipo="vermelho">⚠ Calagem crítica</Badge>;
  if (nc > 1.5) return <Badge tipo="amarelo">⚠ Calagem alta</Badge>;
  return <Badge tipo="amarelo">↑ Calagem moderada</Badge>;
}

export function Card({ children, className = '', style = {} }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export function MetricCard({ label, value, unit, icon, cor = 'verde' }) {
  const corMap = { verde: 'var(--verde)', teal: 'var(--teal)', azul: 'var(--azul)', amarelo: 'var(--amarelo)', vermelho: 'var(--vermelho)' };
  return (
    <div className="metric-card">
      <div className="metric-label">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="metric-value" style={{ color: corMap[cor] || corMap.verde }}>
        {value ?? '—'}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
    </div>
  );
}

export function Modal({ titulo, onFechar, children, largura = 540 }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal" style={{ width: `min(${largura}px, 100%)` }}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onFechar}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Loading({ texto = 'Carregando...' }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <span>{texto}</span>
    </div>
  );
}

export function EmptyState({ icone = '🌾', titulo, descricao, acao }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icone}</div>
      {titulo && <p className="fw-500" style={{ fontSize: 15, color: 'var(--texto)' }}>{titulo}</p>}
      {descricao && <p>{descricao}</p>}
      {acao}
    </div>
  );
}

export function FormField({ label, required, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'var(--vermelho)' }}> *</span>}</label>
      {children}
    </div>
  );
}

export function ProgressBar({ valor, max, cor = 'var(--verde)' }) {
  const pct = Math.min((valor / max) * 100, 100);
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}

export function Alerta({ tipo = 'amarelo', icone, children }) {
  return (
    <div className={`alerta alerta-${tipo}`}>
      {icone && <span>{icone}</span>}
      <div>{children}</div>
    </div>
  );
}

export function SectionHeader({ titulo, subtitulo, acao }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{titulo}</h1>
        {subtitulo && <p className="page-sub">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}
