import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* Elemento de iluminação de fundo minimalista */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

        {/* Cabeçalho do Card de Login */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 mb-4 shadow-sm">
            <Wrench size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Avexas CMMS</h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
            Gestão de Frotas e Manutenção Fabril
          </p>
        </div>

        {/* Banner de Alerta de Erro Vermelho Destacado */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl flex gap-3 items-start mb-6 animate-fade-in">
            <AlertTriangle size={18} className="shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5 text-red-300">Falha na Autenticação</span>
              <span className="leading-relaxed block text-slate-300">{error}</span>
            </div>
          </div>
        )}

        {/* Formulário Corporativo */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
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
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-3.5 pr-11 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
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
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
