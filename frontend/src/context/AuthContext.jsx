import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const s = localStorage.getItem('agro_usuario');
    return s ? JSON.parse(s) : null;
  });
  const [carregando, setCarregando] = useState(false);

  const login = async (email, senha) => {
    setCarregando(true);
    try {
      const r = await authService.login({ email, senha });
      localStorage.setItem('agro_token', r.data.token);
      localStorage.setItem('agro_usuario', JSON.stringify(r.data.usuario));
      setUsuario(r.data.usuario);
      return { sucesso: true };
    } catch (e) {
      return { sucesso: false, erro: e.response?.data?.erro || 'Erro ao fazer login.' };
    } finally {
      setCarregando(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('agro_token');
    localStorage.removeItem('agro_usuario');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
