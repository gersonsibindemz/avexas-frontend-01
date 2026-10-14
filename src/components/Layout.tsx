import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { QRScannerModal } from './QRScannerModal';
import { BrandLogo } from './BrandLogo';
import { usePreventRefresh } from '../hooks/usePreventRefresh';
import {
  Building2,
  Truck,
  Wrench,
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
  Layers,
  AlertTriangle
} from 'lucide-react';

interface NotificationItem {
  id: string | number;
  title?: string;
  titulo?: string;
  message?: string;
  mensagem?: string;
  created_at?: string;
  createdAt?: string;
  is_read?: boolean;
  read?: boolean;
  isRead?: boolean;
  link?: string;
  targetUrl?: string;
  target_url?: string;
  url?: string;
}

const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Agora mesmo';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Há ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Há ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Há ${diffInDays}d`;
  
  return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const Layout: React.FC = () => {
  // Ativa a proteção contra recarregamento acidental de página (F5 e fechar aba)
  usePreventRefresh(true);

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
  
  // Estado para controlar a visibilidade do modal de confirmação de logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Estado para controlar se a sidebar está retraída no desktop
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('cmms_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Estado para controlar o menu hambúrguer em dispositivos móveis
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Estado para controlar a abertura do Scanner QR Code Global
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Gestão de Notificações
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Busca notificações na API (GET /notifications)
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const data = response.data;
      let list: NotificationItem[] = [];
      let count = 0;

      if (Array.isArray(data)) {
        list = data;
        count = list.filter(n => !(n.is_read ?? n.read ?? n.isRead)).length;
      } else if (data && typeof data === 'object') {
        const possibleList = data.notifications || data.data || data.items || [];
        if (Array.isArray(possibleList)) {
          list = possibleList;
        }
        if (typeof data.unreadCount === 'number') {
          count = data.unreadCount;
        } else if (typeof data.unread_count === 'number') {
          count = data.unread_count;
        } else {
          count = list.filter(n => !(n.is_read ?? n.read ?? n.isRead)).length;
        }
      }

      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.warn('Não foi possível obter as notificações:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fechar dropdown de notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  // Marcar uma notificação como lida (PATCH /notifications/:id/read)
  const handleMarkAsRead = async (item: NotificationItem) => {
    const isRead = Boolean(item.is_read ?? item.read ?? item.isRead);
    const itemLink = item.link || item.targetUrl || item.target_url || item.url;

    if (!isRead) {
      try {
        await api.patch(`/notifications/${item.id}/read`);
      } catch (err) {
        console.warn(`Erro ao marcar notificação ${item.id} como lida:`, err);
      } finally {
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true, read: true, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }

    if (itemLink) {
      setIsNotificationOpen(false);
      if (itemLink.startsWith('http://') || itemLink.startsWith('https://')) {
        window.open(itemLink, '_blank');
      } else {
        navigate(itemLink);
      }
    }
  };

  // Marcar todas as notificações como lidas (PATCH /notifications/read-all)
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.warn('Erro ao marcar todas as notificações como lidas:', err);
    } finally {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read: true, isRead: true }))
      );
      setUnreadCount(0);
    }
  };

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

    const items: any[] = [];
    const scope = user.operational_scope || user.tenant?.operational_scope || user.tenant?.operationalScope;
    const isPlantUser = scope === 'plant';

    // Todos os escopos têm acesso aos Ativos
    items.push({
      name: isPlantUser ? 'Equipamentos Fabris' : 'Frotas e Viaturas',
      path: '/app/assets',
      icon: isPlantUser ? Wrench : Truck,
      description: isPlantUser ? 'Equipamentos industriais' : 'Registo e frotas de viaturas'
    });

    // Ordens de Serviço
    items.push({
      name: 'Ordens de Serviço',
      path: '/app/work-orders',
      icon: ClipboardList,
      description: user.role === 'technician' ? 'Minhas tarefas de manutenção' : 'Manutenção corretiva e preventiva'
    });

    // Combustível disponível para tenant_admin e supervisor apenas se NÃO for plant
    if ((user.role === 'tenant_admin' || user.role === 'supervisor') && !isPlantUser) {
      items.push({
        name: 'Combustível',
        path: '/app/fuel',
        icon: Fuel,
        description: 'Consumos e eficiência de combustível'
      });
    }

    if (user.role === 'tenant_admin' || user.role === 'supervisor') {
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
            <BrandLogo variant="light" collapsed={isCollapsed} className="h-8 w-auto max-w-[170px]" />
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
                  <span className="truncate">{item.name}</span>
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
        <div className="p-3 border-t border-slate-200 bg-white">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer ${
              isCollapsed ? 'p-2' : ''
            }`}
            title="Terminar Sessão"
          >
            <LogOut size={16} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap font-medium">Terminar Sessão</span>}
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
          <div className="flex items-center gap-3 overflow-hidden">
            <BrandLogo variant="light" className="h-8 w-auto max-w-[170px]" />
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
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé Mobile */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
          >
            <LogOut size={16} />
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

            {/* Botão de Scan QR Code Global (Header) - EXCLUSIVO PARA MÓVEL */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="md:hidden p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all border border-blue-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Escanear Equipamento (Código QR)"
            >
              <QrCode size={16} />
              <span>Escanear</span>
            </button>

            {/* Ícone de Notificações com Dropdown Popover */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(prev => !prev)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-all relative border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-center"
                aria-label="Visualizar notificações"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center justify-center min-w-[18px] h-[18px] leading-none shadow-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Popover Dropdown (Design Material Flat Corporativo) */}
              {isNotificationOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  {/* Cabeçalho do Popover */}
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Notificações</span>
                      {unreadCount > 0 && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                          {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  {/* Lista de Notificações */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2 border border-slate-200">
                          <Bell size={18} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Sem notificações pendentes.</p>
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const isRead = Boolean(item.is_read ?? item.read ?? item.isRead);
                        const title = item.title || item.titulo || 'Notificação';
                        const message = item.message || item.mensagem || '';
                        const createdAt = item.created_at || item.createdAt;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleMarkAsRead(item)}
                            className={`p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                              isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                            }`}
                          >
                            {!isRead ? (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-transparent shrink-0 mt-1.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs ${isRead ? 'font-medium text-slate-800' : 'font-semibold text-slate-900'}`}>
                                {title}
                              </h4>
                              {message && (
                                <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                                  {message}
                                </p>
                              )}
                              {createdAt && (
                                <span className="block text-[10px] text-slate-400 mt-1">
                                  {formatTimeAgo(createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

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

        {/* MODAL DE CONFIRMAÇÃO DE LOGOUT */}
        {showLogoutConfirm && (
          <div 
            className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <div 
              className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-5 shadow-lg relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                  <span>Terminar Sessão</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Texto Descritivo */}
              <p className="text-slate-600 text-xs mb-5 leading-relaxed">
                Tem a certeza de que pretende encerrar a sua sessão de trabalho no CMMS?
              </p>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="bg-white border border-slate-300 text-slate-700 rounded-md text-xs px-3 py-1.5 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs px-3 py-1.5 font-medium transition-colors cursor-pointer"
                >
                  Sim, Terminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
