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
  // Quando a requisição envia FormData (upload de ficheiros/documentos),
  // removemos o 'Content-Type': 'application/json' predefinido para que o
  // navegador/Axios gere automaticamente 'multipart/form-data; boundary=...' com o boundary correto.
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete (config.headers as Record<string, unknown>)['content-type'];
    }
  }
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
    // Normaliza a mensagem de erro do backend: as rotas devolvem { message }
    // (work-orders, fuel, auth) ou { error } (assets, parts, middlewares).
    // Como os catchs das páginas usam `err.message` como fallback, copiamos aqui
    // a mensagem real do servidor para nunca mostrar um erro genérico.
    const data = error?.response?.data;
    if (data && typeof data === 'object') {
      const backendMessage = data.message || data.error || data.detail;
      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        error.message = backendMessage;
      }
    }
    return Promise.reject(error);
  },
);

// O backend do CMMS devolve validações em { message } (work-orders, fuel, auth)
// ou em { error } (assets, parts, middlewares). Este helper extrai a mensagem real
// para que o utilizador veja sempre o motivo do erro do servidor.
export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const apiError = err as {
    message?: string;
    response?: { status?: number; data?: { message?: string; error?: string; detail?: string } };
  };
  const data = apiError?.response?.data;
  // Respostas 404/405 chegam como HTML (rota inexistente) — não servem como mensagem.
  const status = apiError?.response?.status;
  if ((status === 404 || status === 405) && typeof data !== 'object') {
    return fallback;
  }
  return (
    (data && typeof data === 'object' && (data.message || data.error || data.detail)) ||
    apiError?.message ||
    fallback
  );
};

// Converte um valor de formulário em número finito.
// Retorna undefined quando o valor é vazio/inválido para evitar NaN
// (o backend rejeita NaN com 400 "Campo numérico inválido").
export const toFiniteNumber = (value: unknown): number | undefined => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};
