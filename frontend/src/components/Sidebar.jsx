import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROTAS = [
  { path: '/dashboard',    label: 'Dashboard',        icone: '📊' },
  { path: '/propriedades', label: 'Propriedades',     icone: '🏡' },
  { path: '/talhoes',      label: 'Talhões',          icone: '🗺️' },
  { path: '/solo',         label: 'Análise de Solo',  icone: '🧪' },
  { path: '/pluviometria', label: 'Pluviometria',     icone: '🌧️' },
  { path: '/produtividade',label: 'Produtividade',    icone: '🌾' },
  { path: '/relatorios',   label: 'Relatórios',       icone: '📋' },
];

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const iniciais = usuario?.nome
    ? usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🌱</div>
        <div>
          <div className="sidebar-logo-text">AgroAnalytics</div>
          <div className="sidebar-logo-sub">Agricultura de Precisão</div>
        </div>
      </div>

      <nav className="nav">
        {ROTAS.map(r => (
          <button
            key={r.path}
            className={`nav-item ${pathname.startsWith(r.path) ? 'ativo' : ''}`}
            onClick={() => navigate(r.path)}
          >
            <span className="icone">{r.icone}</span>
            {r.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">{iniciais}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario?.nome}</div>
          <div style={{ fontSize: 11, color: 'var(--texto-sub)' }}>{usuario?.tipo}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout} title="Sair">⬅</button>
      </div>
    </aside>
  );
}
