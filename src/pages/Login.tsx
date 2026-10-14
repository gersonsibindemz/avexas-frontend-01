import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import {
  Wrench,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      
      // Redirecionamento condicional baseado no papel (role) do utilizador
      if (loggedUser.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/app/assets');
      }
    } catch (err: any) {
      console.error('Erro durante o login:', err);
      // Mensagem de erro amigável baseada no erro retornado ou erro de rede
      const message = err.message || 'Ocorreu um erro ao conectar ao servidor. Verifique a sua ligação à internet.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-md shadow-sm p-8 relative">
        
        {/* Cabeçalho do Card de Login */}
        <div className="text-center mb-8">
          <BrandLogo variant="light" className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Avexas CMMS</h1>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">
            Gestão de Frotas e Manutenção Fabril
          </p>
        </div>

        {/* Banner de Alerta de Erro Vermelho Destacado */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-start mb-6 animate-fade-in">
            <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5 text-red-800">Falha na Autenticação</span>
              <span className="leading-relaxed block text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Formulário Corporativo */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              E-mail Corporativo
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: utilizador@empresa.co.mz"
              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-all font-mono placeholder-slate-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Palavra-passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduza a sua senha"
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-3.5 pr-11 py-2.5 text-sm text-slate-900 focus:outline-none transition-all font-mono placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Ocultar palavra-passe' : 'Exibir palavra-passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center leading-relaxed py-1">
            Acesso restrito a utilizadores autorizados. Sessão protegida por encriptação ponta a ponta.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0066FF] hover:bg-[#0052CC] active:bg-[#0040A0] text-white font-medium py-2.5 px-4 rounded-md transition-all text-sm shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>A conectar ao servidor Render...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
