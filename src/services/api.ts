import axios from 'axios';

// Instância centralizada do Axios para requisições ao backend do CMMS
export const api = axios.create({
  baseURL: 'https://cmms-backend-api.onrender.com/api',
  withCredentials: true,
});

// Interceptor para tratamento de erros global (ex: deslogar se 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirecionar para login ou limpar estado local se necessário
      console.warn('Sessão expirada ou não autorizada.');
    }
    return Promise.reject(error);
  }
);
