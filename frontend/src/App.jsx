import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Propriedades from './pages/Propriedades';
import Talhoes from './pages/Talhoes';
import Solo from './pages/Solo';
import Pluviometria from './pages/Pluviometria';
import Produtividade from './pages/Produtividade';
import Relatorios from './pages/Relatorios';

function RotaProtegida({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { usuario } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      <Route path="/propriedades" element={<RotaProtegida><Propriedades /></RotaProtegida>} />
      <Route path="/talhoes" element={<RotaProtegida><Talhoes /></RotaProtegida>} />
      <Route path="/solo" element={<RotaProtegida><Solo /></RotaProtegida>} />
      <Route path="/pluviometria" element={<RotaProtegida><Pluviometria /></RotaProtegida>} />
      <Route path="/produtividade" element={<RotaProtegida><Produtividade /></RotaProtegida>} />
      <Route path="/relatorios" element={<RotaProtegida><Relatorios /></RotaProtegida>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />
      </AuthProvider>
    </BrowserRouter>
  );
}
