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

// Interceptor de resposta: trata 401 (sessão expirada).
// O backend não expõe endpoint de refresh token, portanto não há renovação automática.
// Em caso de 401, dispara evento cmms:auth-expired para logout automático no frontend.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Sessão expirada ou não autorizada.');
      window.dispatchEvent(new CustomEvent('cmms:auth-expired'));
    }
    return Promise.reject(error);
  },
);
