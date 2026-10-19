import axios from 'axios';

// Instância centralizada do Axios para requisições ao backend do CMMS
// Configurada para autenticação baseada em cookies HttpOnly (withCredentials: true).
// O navegador envia os cookies automaticamente em requisições cross-origin.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://cmms-backend-api.onrender.com/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor de requisição: com cookies HttpOnly o navegador envia os cookies automaticamente.
// Não é necessário (e não deve) injetar manualmente um cabeçalho Authorization: Bearer via JavaScript,
// pois o cookie HttpOnly não é acessível via JS. A autenticação é gerida exclusivamente pelos cookies.
api.interceptors.request.use((config) => {
  return config;
});

// Interceptor de resposta: trata 401 (sessão expirada) e tenta renovação via cookie de refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Tenta renovar a sessão usando o cookie de refresh (HttpOnly, enviado automaticamente)
      try {
        await api.post('/auth/refresh');
        // Renovação bem-sucedida: repete a requisição original
        return api(originalRequest);
      } catch (refreshErr) {
        // Renovação falhou: sessão expirada. Notifica a aplicação para efetuar logout.
        console.warn('Sessão expirada ou não autorizada. A fazer logout...');
        window.dispatchEvent(new CustomEvent('cmms:auth-expired'));
        return Promise.reject(refreshErr);
      }
    }

    if (error.response?.status === 401) {
      console.warn('Sessão expirada ou não autorizada.');
      window.dispatchEvent(new CustomEvent('cmms:auth-expired'));
    }

    return Promise.reject(error);
  },
);
