import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { QRScannerModal } from './QRScannerModal';
import {
  Building2,
  Truck,
  ClipboardList,
  Fuel,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Settings,
  Shield,
  Briefcase,
  QrCode,
  Users,
  Layers
} from 'lucide-react';

export const Layout: React.FC = () => {
  const {
    user,
    logout,
    loading,
    currentScope,
    setCurrentScope,
    isTenantAdmin,
    isSuperAdmin,
    isSupervisor,
    isTechnician,
    isDriverOperator,
    isFleet,
    isPlant
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estado para controlar se a sidebar está retraída no desktop
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('cmms_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Estado para controlar o menu hambúrguer em dispositivos móveis
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Estado para controlar a abertura do Scanner QR Code Global
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cmms_sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Fecha o menu móvel ao mudar de rota
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 font-medium tracking-wide text-sm">A carregar sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-md p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-200">
            <Shield size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Não Autorizado</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Por favor, inicie sessão com as suas credenciais para gerir os ativos e as frotas do CMMS.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-medium py-2.5 px-4 rounded-md transition-colors text-sm shadow-none"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  // Tratamento do papel (role) do utilizador de forma amigável
  const formatRole = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Administrador Geral';
      case 'tenant_admin':
        return 'Gestor do Contrato (Admin)';
      case 'supervisor':
        return 'Supervisor Operacional';
      case 'technician':
        return 'Técnico de Campo';
      case 'driver_operator':
        return 'Motorista / Operador';
      default:
        return 'Colaborador';
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao terminar sessão:', error);
    }
  };

  // Definição dos links de navegação com base na role
  const getNavigationItems = () => {
    if (user.role === 'super_admin') {
      return [
        {
          name: 'Empresas & Contratos',
          path: '/super-admin',
          icon: Building2,
          description: 'Controlo de contratos e tenants'
        }
      ];
    }

    const items = [];

    // Todos os escopos têm acesso aos Ativos
    items.push({
      name: 'Ativos e Frotas',
      path: '/app/assets',
      icon: Truck,
      description: isPlant ? 'Equipamentos industriais' : 'Registo e frotas de viaturas'
    });

    // Ordens de Serviço
    items.push({
      name: 'Ordens de Serviço',
      path: '/app/work-orders',
      icon: ClipboardList,
      description: user.role === 'technician' ? 'Minhas tarefas de manutenção' : 'Manutenção corretiva e preventiva'
    });

    // Combustível disponível para tenant_admin e supervisor
    if (user.role === 'tenant_admin' || user.role === 'supervisor') {
      items.push({
        name: 'Combustível',
        path: '/app/fuel',
        icon: Fuel,
        description: 'Consumos e eficiência de combustível'
      });
      items.push({
        name: 'Inventário',
        path: '/app/inventory',
        icon: Layers,
        description: 'Gestão de peças e consumíveis'
      });
    }

    // Gestão de Utilizadores apenas para tenant_admin
    if (user.role === 'tenant_admin') {
      items.push({
        name: 'Gestão de Utilizadores',
        path: '/app/users',
        icon: Users,
        description: 'Gestão de contas e permissões'
      });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  // Identificação da página atual para exibição de breadcrumbs
  const getActivePageName = () => {
    const activeItem = navigationItems.find(item => location.pathname.startsWith(item.path));
    if (activeItem) return activeItem.name;
    if (location.pathname === '/app/profile') return 'Perfil de Utilizador';
    if (location.pathname === '/app/settings') return 'Configurações do Sistema';
    return 'Painel de Controlo';
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* SIDEBAR PARA DESKTOP */}
      <aside 
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 relative z-20 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header da Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center justify-center shrink-0">
              <Briefcase size={18} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-wide text-slate-900 uppercase">CMMS Moçambique</span>
                <span className="text-[10px] text-blue-700 font-semibold tracking-wider">Gestão Operacional</span>
              </div>
            )}
          </div>

          {/* Botão de Retração */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md transition-all border border-transparent hover:border-slate-200"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-none font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <Icon 
                  size={18} 
                  className={`shrink-0 transition-transform group-hover:scale-105 duration-150 ${
                    isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-700'
                  }`} 
                />
                
                {!isCollapsed && (
                  <div className="flex flex-col truncate">
                    <span className="leading-5">{item.name}</span>
                    <span className="text-[10px] font-normal text-slate-500 truncate group-hover:text-slate-600">
                      {item.description}
                    </span>
                  </div>
                )}

                {/* Tooltip quando colapsado */}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md font-medium">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Avatar */}
            <div className="w-9 h-9 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center justify-center shrink-0 font-bold text-xs tracking-wider uppercase">
              {user.fullName.substring(0, 2)}
            </div>

            {!isCollapsed && (
              <div className="flex flex-col truncate flex-1">
                <span className="text-sm font-semibold text-slate-900 truncate" title={user.fullName}>
                  {user.fullName}
                </span>
                <span className="text-[11px] font-medium text-blue-700 truncate">
                  {formatRole(user.role)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate" title={user.tenantName || 'Avexas Global'}>
                  {user.tenantName || 'Avexas Global'}
                </span>
              </div>
            )}
          </div>

          {/* Botão Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 active:bg-red-100 border border-slate-300 hover:border-red-200 transition-all cursor-pointer ${
              isCollapsed ? 'p-1' : ''
            }`}
            title="Terminar Sessão"
          >
            <LogOut size={14} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap tracking-wide">Terminar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* DRAWER PARA DISPOSITIVOS MÓVEIS */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside 
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 transform md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header do Mobile Drawer */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-wider text-slate-900 uppercase">CMMS Moçambique</span>
              <span className="text-[9px] text-blue-700 font-bold tracking-widest uppercase">Frotas & Chão de Fábrica</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md transition-all"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links de Navegação Mobile */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  <span className="text-[10px] font-normal text-slate-500 mt-0.5">
                    {item.description}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé Mobile */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center justify-center shrink-0 font-bold">
              {user.fullName.substring(0, 2)}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {user.fullName}
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                {formatRole(user.role)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase truncate">
                {user.tenantName || 'Avexas Global'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-300 hover:border-red-200 transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (SLATE-50) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* TOP BAR / CABEÇALHO */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          
          {/* Lado esquerdo: hambúrguer mobile + Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-800 p-2 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb / Título do Contexto */}
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className="text-slate-400 font-medium">CMMS</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 font-semibold truncate max-w-[150px] md:max-w-xs">
                {user.tenantName || 'Avexas Global'}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold tracking-wide">
                {getActivePageName()}
              </span>
            </div>
          </div>

          {/* Lado direito: Notificações, Perfil, Info de Localização Moçambique */}
          <div className="flex items-center gap-3">
            
            {/* Alternador de Escopo de Negócio ('both') */}
            {(user.operational_scope === 'both' || user.tenant?.operational_scope === 'both' || user.tenant?.operationalScope === 'both') && (
              <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
                <button
                  onClick={() => setCurrentScope('fleet')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    currentScope === 'fleet'
                      ? 'bg-blue-700 text-white shadow-none'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Frota
                </button>
                <button
                  onClick={() => setCurrentScope('plant')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    currentScope === 'plant'
                      ? 'bg-blue-700 text-white shadow-none'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fábrica
                </button>
              </div>
            )}

            {/* Indicador de Status do Sistema / Sincronização Local */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Online · Maputo</span>
            </div>

            {/* Botão de Scan QR Code Global (Header) */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all border border-blue-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Escanear Equipamento (Código QR)"
            >
              <QrCode size={16} />
              <span className="hidden sm:inline">Escanear</span>
            </button>

            {/* Ícone de Notificações */}
            <button 
              className="p-2 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-all relative border border-transparent hover:border-slate-200 cursor-pointer"
              aria-label="Visualizar notificações"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
            </button>

            {/* Separador vertical */}
            <span className="w-px h-6 bg-slate-200 hidden md:inline"></span>

            {/* Perfil e Configurações */}
            <div className="flex items-center gap-2">
              <NavLink 
                to="/app/profile"
                className={({ isActive }) => 
                  `p-2 rounded-md transition-all border shrink-0 ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100 hover:border-slate-200'
                  }`
                }
                title="Meu Perfil"
              >
                <User size={18} />
              </NavLink>
              <NavLink 
                to="/app/settings"
                className={({ isActive }) => 
                  `p-2 rounded-md transition-all border shrink-0 ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100 hover:border-slate-200'
                  }`
                }
                title="Configurações"
              >
                <Settings size={18} />
              </NavLink>
            </div>
          </div>
        </header>

        {/* ÁREA DE OUTLET COM ROLAGEM INDEPENDENTE */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="min-h-full p-4 md:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
            <Outlet />
          </div>
        </main>

        {/* BARRA DE NAVEGAÇÃO INFERIOR MÓVEL */}
        {user.role !== 'super_admin' && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-30 shadow-md">
            <NavLink
              to="/app/assets"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Truck size={18} />
              <span className="mt-1">Ativos</span>
            </NavLink>
            
            <NavLink
              to="/app/work-orders"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <ClipboardList size={18} />
              <span className="mt-1">Ordens</span>
            </NavLink>

            {/* Botão Central de Scan Flutuante */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex flex-col items-center justify-center -mt-6 bg-blue-700 hover:bg-blue-800 text-white w-14 h-14 rounded-full shadow-md active:scale-95 transition-all border-4 border-slate-50 shrink-0 cursor-pointer"
              aria-label="Escanear QR Code de Campo"
            >
              <QrCode size={22} />
            </button>

            {/* Botão de Combustível condicional */}
            {(user.role === 'tenant_admin' || user.role === 'supervisor') && (
              <NavLink
                to="/app/fuel"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
                    isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <Fuel size={18} />
                <span className="mt-1">Combustível</span>
              </NavLink>
            )}

            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <User size={18} />
              <span className="mt-1">Perfil</span>
            </NavLink>
          </nav>
        )}

        {/* MODAL DE LEITOR QR CODE GLOBAL */}
        <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      </div>
    </div>
  );
};

export default Layout;
