import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
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
      const message = err.message || 'Ocorreu um erro ao conectar ao servidor. Verifique a sua ligação à internet.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 selection:bg-blue-100 relative overflow-hidden bg-slate-50"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Gradiente radial suave no topo para profundidade */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent" />

      {/* LOGÓTIPO CORPORATIVO (Fora do Cartão) */}
      <div className="mb-6 flex flex-col items-center select-none relative z-10">
        <img
          src="https://i.postimg.cc/NfvHTQTR/avexas-logo-transp-copy.png"
          alt="Avexas CMMS"
          className="h-9 w-auto object-contain transition-all hover:opacity-90"
        />
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/60 border border-slate-300/50 text-[11px] font-medium text-slate-600 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          CMMS Enterprise Platform
        </div>
      </div>

      {/* CARTÃO DE AUTENTICAÇÃO */}
      <div className="w-full max-w-[380px] bg-white border border-slate-200/80 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 sm:p-7 relative z-10 transition-all">
        {/* Cabeçalho do Cartão */}
        <div className="mb-5 text-center">
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Iniciar Sessão</h1>
          <p className="text-xs text-slate-500 mt-1">Introduza as suas credenciais para aceder ao sistema</p>
        </div>

        {/* Banner de Alerta de Erro */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug font-medium">
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-medium text-slate-700 block mb-1.5">
              Utilizador ou E-mail *
            </label>
            <input
              id="email"
              type="text"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: tecnico@empresa.co.mz"
              autoComplete="username"
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium text-slate-700 block mb-1.5">
              Palavra-passe *
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handlePasswordKeyEvent}
                onKeyUp={handlePasswordKeyEvent}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full h-9 pl-3 pr-9 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 h-9 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                aria-label={showPassword ? 'Ocultar palavra-passe' : 'Exibir palavra-passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Aviso de Caps Lock Ativado */}
            {capsLockActive && (
              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Bloq Maiús (Caps Lock) ativado</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium text-xs rounded-md transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>A autenticar...</span>
              </>
            ) : (
              <span>Acessar a Plataforma</span>
            )}
          </button>
        </form>
      </div>

      {/* RODAPÉ DO CARTÃO / AVISO LEGAL */}
      <div className="mt-6 text-center select-none relative z-10">
        <span className="text-[11px] text-slate-400 font-normal">
          Avexas CMMS &bull; Sistema de Gestão de Manutenção
        </span>
      </div>
    </div>
  );
};

export default LoginPage;
