import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('agro_token');
      localStorage.removeItem('agro_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authService = {
  login: (dados) => api.post('/auth/login', dados),
  registrar: (dados) => api.post('/auth/registrar', dados),
  perfil: () => api.get('/auth/perfil'),
};

export const propriedadeService = {
  listar: () => api.get('/propriedades'),
  obter: (id) => api.get(`/propriedades/${id}`),
  criar: (dados) => api.post('/propriedades', dados),
  atualizar: (id, dados) => api.put(`/propriedades/${id}`, dados),
  excluir: (id) => api.delete(`/propriedades/${id}`),
  talhoes: (id) => api.get(`/propriedades/${id}/talhoes`),
};

export const talhaoService = {
  criar: (dados) => api.post('/talhoes', dados),
  obter: (id) => api.get(`/talhoes/${id}`),
  atualizar: (id, dados) => api.put(`/talhoes/${id}`, dados),
  excluir: (id) => api.delete(`/talhoes/${id}`),
};

export const analiseService = {
  listar: (talhaoId) => api.get(`/talhoes/${talhaoId}/analises`),
  criar: (dados) => api.post('/analises', dados),
  excluir: (id) => api.delete(`/analises/${id}`),
  calcularCalagem: (dados) => api.post('/analises/calagem', dados),
};

export const chuvaService = {
  listar: (params) => api.get('/chuva', { params }),
  criar: (dados) => api.post('/chuva', dados),
  criarLote: (registros) => api.post('/chuva/lote', { registros }),
  excluir: (id) => api.delete(`/chuva/${id}`),
  comparativo: (params) => api.get('/chuva/comparativo', { params }),
};

export const cicloService = {
  listar: (params) => api.get('/ciclos', { params }),
  criar: (dados) => api.post('/ciclos', dados),
  atualizar: (id, dados) => api.put(`/ciclos/${id}`, dados),
  excluir: (id) => api.delete(`/ciclos/${id}`),
};

export const relatorioService = {
  dashboard: () => api.get('/relatorios/dashboard'),
  completo: (params) => api.get('/relatorios/completo', { params }),
};

export default api;
