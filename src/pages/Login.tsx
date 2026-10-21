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
        navigate('/app/dashboard');
      }
    } catch (err: any) {
      console.error('Erro durante o login:', err);
      const message = err.message || 'Ocorreu um erro ao conectar ao servidor. Verifique a sua ligação à internet.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      
      {/* Logótipo FORA do Cartão */}
      <div className="mb-6 flex justify-center z-10">
        <img
          src="https://i.postimg.cc/NfvHTQTR/avexas-logo-transp-copy.png"
          alt="Avexas CMMS"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="h-10 w-auto object-contain select-none pointer-events-none"
          style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        />
      </div>

      {/* Cartão do Formulário Compacto */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm w-full max-w-sm p-6 sm:p-7 space-y-4 z-10">
        
        {/* Banner de Alerta de Erro */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex gap-2.5 items-start animate-fade-in">
            <AlertTriangle size={16} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-red-800">Falha na Autenticação</span>
              <span className="leading-relaxed text-red-700">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                className="w-full h-10 pl-3 pr-10 text-sm rounded-lg border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {capsLockActive && (
              <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                ⇪ Fixador de Maiúsculas (Caps Lock) ativado
              </span>
            )}
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-sm rounded-lg transition-colors shadow-none flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                <span>Acessar...</span>
              </div>
            ) : (
              <span>Acessar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
