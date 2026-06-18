import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

export default function Login() {
  const [modo, setModo] = useState('login'); // 'login' | 'registrar'
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      if (modo === 'login') {
        const r = await login(form.email, form.senha);
        if (r.sucesso) navigate('/dashboard');
        else setErro(r.erro);
      } else {
        await authService.registrar(form);
        const r = await login(form.email, form.senha);
        if (r.sucesso) navigate('/dashboard');
      }
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EAF3DE 0%, #E1F5EE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--verde)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px' }}>🌱</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--verde)' }}>AgroAnalytics</h1>
          <p style={{ color: 'var(--texto-sub)', fontSize: 14 }}>Gestão agrícola de precisão</p>
        </div>

        <div className="card">
          <div className="card-body">
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--cinza-claro)', padding: 4, borderRadius: 8 }}>
              {[['login', 'Entrar'], ['registrar', 'Criar conta']].map(([m, l]) => (
                <button key={m} onClick={() => { setModo(m); setErro(''); }}
                  style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: modo === m ? 600 : 400, background: modo === m ? 'white' : 'transparent', color: modo === m ? 'var(--verde)' : 'var(--texto-sub)', transition: 'all 0.15s', fontSize: 13 }}>
                  {l}
                </button>
              ))}
            </div>

            {erro && <div className="alerta alerta-vermelho" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}

            <form onSubmit={handleSubmit}>
              {modo === 'registrar' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nome completo *</label>
                    <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="Ex: João Pedro Santos de Araújo" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input className="form-input" value={form.telefone} onChange={set('telefone')} placeholder="(43) 99999-0000" />
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Senha *</label>
                <input className="form-input" type="password" value={form.senha} onChange={set('senha')} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={carregando}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                {carregando ? '⏳ Aguarde...' : modo === 'login' ? '🌾 Entrar' : '✅ Criar minha conta'}
              </button>
            </form>

            {modo === 'login' && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--verde-claro)', borderRadius: 8, fontSize: 12, color: 'var(--verde-texto)' }}>
                <strong>Conta demo:</strong> joao@agroanalytics.com / 123456
              </div>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--texto-sub)', fontSize: 12 }}>
          TCC — João Pedro Santos de Araújo · UTFPR Cornélio Procópio · 2025
        </p>
      </div>
    </div>
  );
}
