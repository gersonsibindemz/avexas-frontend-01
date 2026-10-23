import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { QRScannerModal } from './QRScannerModal';
import { BrandLogo } from './BrandLogo';
import { usePreventRefresh } from '../hooks/usePreventRefresh';
import { useVersionCheck } from '../hooks/useVersionCheck';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  LayoutDashboard,
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
  ChevronDown,
  Calendar,
  Bell,
  User,
  Settings,
  Shield,
  Briefcase,
  QrCode,
  Users,
  Layers,
  AlertTriangle,
  Camera,
  Terminal
} from 'lucide-react';
import { NotificationItem, deduplicateNotifications } from '../services/notificationService';

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
  usePreventRefresh(false);
  const { hasNewVersion, updateApp } = useVersionCheck();

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
    isPlant,
    isMixedScope
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estado para controlar a visibilidade do modal de confirmação de logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  useEscapeKey(() => setShowLogoutConfirm(false), showLogoutConfirm);

  // Estado para controlar se a sidebar está retraída no desktop
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('cmms_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Estado para o submenu sanfona de Manutenção
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);

  // Estado para controlar o menu hambúrguer em dispositivos móveis
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Estado para controlar a abertura do Scanner QR Code Global
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Gestão de Notificações
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Verificação de conformidade ao entrar (executa no máximo 1 vez por sessão para não duplicar gatilhos)
  useEffect(() => {
    if (user && (user.role === 'tenant_admin' || user.role === 'supervisor')) {
      const sessionKey = `cmms_compliance_checked_${user.id || user.email}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'true');
        api.get('/notifications/check-compliance').catch(() => {});
      }
    }
  }, [user]);

  // Busca notificações na API (GET /notifications) com deduplicação inteligente por assunto
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const data = response.data;
      let list: NotificationItem[] = [];

      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        const possibleList = data.notifications || data.data || data.items || [];
        if (Array.isArray(possibleList)) {
          list = possibleList;
        }
      }

      // Deduplica eventos que andam em pares no mesmo datetime, preservando repetições legítimas em datas distintas
      const uniqueList = deduplicateNotifications(list).slice(0, 30);
      setNotifications(uniqueList);
      const unread = uniqueList.filter(n => !(n.is_read ?? n.read ?? n.isRead)).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn('Não foi possível obter as notificações:', err);
    }
  };

  // Notificações estáticas - atualiza apenas ao montar o componente
  useEffect(() => {
    if (user) {
      fetchNotifications();
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

  // Marcar uma notificação como lida (PATCH /notifications/:id/read para o item e eventuais duplicatas em par)
  const handleMarkAsRead = async (item: NotificationItem) => {
    const isRead = Boolean(item.is_read ?? item.read ?? item.isRead);
    const itemLink = item.link || item.targetUrl || item.target_url || item.url;

    if (!isRead) {
      const idsToMark = item._duplicateIds && item._duplicateIds.length > 0 ? item._duplicateIds : [item.id];
      try {
        await Promise.allSettled(idsToMark.map(id => api.patch(`/notifications/${id}/read`)));
      } catch (err) {
        console.warn(`Erro ao marcar notificação ${item.id} como lida:`, err);
      } finally {
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true, read: true, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }

    if (itemLink && itemLink !== '#' && itemLink.trim() !== '') {
      setIsNotificationOpen(false);
      if (itemLink.startsWith('http')) {
        window.open(itemLink, '_blank');
      } else {
        // Garante que o link começa com barra para não quebrar o router
        navigate(itemLink.startsWith('/') ? itemLink : `/${itemLink}`);
      }
    } else {
      setIsNotificationOpen(false);
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
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erro ao terminar sessão:', error);
    }
  };

  // Registo de Saída ao fechar aba ou navegador (Prompt 1 - Requisito 2)
  useEffect(() => {
    if (!user) return;
    const handleBeforeUnload = () => {
      try {
        fetch('/api/auth/record-exit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          credentials: 'include'
        }).catch(() => {});
      } catch {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // Regra de Perfil do Botão Escanear: Apenas para roles DIFERENTES de tenant_admin e super_admin (Prompt 3 - Requisito 1)
  const canScan = user?.role !== 'tenant_admin' && user?.role !== 'super_admin';

  // Definição dos links de navegação estritamente com base na matriz de permissões por perfil (role)
  const getNavigationItems = () => {
    if (!user) return [];

    // 1. super_admin: Mantém todos os privilégios globais intactos
    if (user.role === 'super_admin') {
      return [
        {
          name: 'Empresas & Contratos',
          path: '/super-admin',
          icon: Building2,
          description: 'Controlo de contratos e tenants'
        },
        {
          name: 'Gestão de Utilizadores',
          path: '/app/users',
          icon: Users,
          description: 'Gestão de contas e permissões'
        }
      ];
    }

    // 2. driver_operator: Não tem permissão para aceder a áreas de gestão ou criar ordens de serviço.
    // A sua única ação permitida no sistema é o portal tátil de vistoria e reporte de anomalias/avarias.
    if (user.role === 'driver_operator') {
      return [
        {
          name: 'Vistoria & Avarias',
          path: '/app/assets',
          icon: AlertTriangle,
          description: 'Portal de vistoria e reporte de anomalias em campo'
        }
      ];
    }

    // 3. technician: Visualiza exclusivamente as Ordens de Serviço que foram atribuídas diretamente à sua pessoa.
    // Bloqueia o acesso à listagem geral de todas as Ordens de Serviço da empresa e áreas de gestão.
    if (user.role === 'technician') {
      return [
        {
          name: 'Ordens de Serviço',
          path: '/app/work-orders',
          icon: ClipboardList,
          description: 'Minhas ordens de serviço atribuídas'
        }
      ];
    }

    // 4. supervisor e tenant_admin
    const items: any[] = [];
    const isPlantSupervisor = user.role === 'supervisor' && user.operational_scope === 'plant';
    const isPlantTenant = !isMixedScope && (user.operational_scope === 'plant' || user.tenant?.operational_scope === 'plant' || currentScope === 'plant');

    items.push({
      name: 'Dashboard',
      path: '/app/dashboard',
      icon: LayoutDashboard,
      description: 'Indicadores e estado operacional'
    });

    // Unificação da Vista de Frota e Fábrica para tenants com escopo misto
    const assetsLabel = isMixedScope
      ? (user.role === 'supervisor' ? (isPlantSupervisor ? 'Equipamentos Fabris' : 'Frota') : 'Ativos e Frotas')
      : (isPlantSupervisor || isPlantTenant ? 'Equipamentos Fabris' : 'Frota');
    const assetsIcon = (isPlantSupervisor || isPlantTenant) ? Wrench : Truck;

    items.push({
      name: assetsLabel,
      path: '/app/assets',
      icon: assetsIcon,
      description: isMixedScope && user.role === 'tenant_admin'
        ? 'Vista unificada de viaturas e equipamentos fabris'
        : (assetsLabel === 'Equipamentos Fabris' ? 'Equipamentos industriais' : 'Registo e frotas de viaturas')
    });

    // Grupo Manutenção (Planos, Equipes e Ordens de Serviço)
    items.push({
      name: 'Manutenção',
      type: 'accordion',
      icon: Wrench,
      subItems: [
        {
          name: 'Planos',
          path: '/app/maintenance-plans',
          icon: Calendar
        },
        {
          name: 'Equipes',
          path: '/app/teams',
          icon: Users
        },
        {
          name: 'Ordens',
          path: '/app/work-orders',
          icon: ClipboardList
        }
      ]
    });

    // Combustível disponível apenas se a empresa/escopo opera com viaturas (não fabril exclusivo)
    if (!isPlantSupervisor && !isPlantTenant) {
      items.push({
        name: 'Combustível',
        path: '/app/fuel',
        icon: Fuel,
        description: 'Consumos e eficiência de combustível'
      });
    }

    // Inventário
    items.push({
      name: 'Inventário',
      path: '/app/inventory',
      icon: Layers,
      description: 'Gestão de peças e consumíveis'
    });

    return items;
  };

  const navigationItems = getNavigationItems();

  // Notificações exibidas 100% sincronizadas com a lista e o contador
  const uniqueNotifications = notifications;

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
        className={`hidden md:flex flex-col bg-[#0B132B] border-r border-white/10 transition-all duration-300 relative z-20 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header da Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 relative">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src="https://i.postimg.cc/QxqWHtpg/avexas-logo-white.png"
                  alt="Avexas CMMS"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  className="h-10 sm:h-11 w-auto max-w-[170px] object-contain transition-all duration-200"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                />
              </div>

              {/* Botão de Retração */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-all shrink-0 cursor-pointer"
                aria-label="Recolher menu"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="w-full flex justify-center py-1">
                <img
                  src="https://i.postimg.cc/GtJrMZ6H/avexasfavico.png"
                  alt="Avexas"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  className="h-8 w-8 object-contain mx-auto"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                />
              </div>

              {/* Botão Flutuante de Expansão */}
              <button
                onClick={() => setIsCollapsed(false)}
                className="absolute -right-3 top-5 z-30 bg-[#0B132B] border border-white/20 text-slate-400 hover:text-white rounded-full p-1 shadow-md transition-all cursor-pointer"
                aria-label="Expandir menu"
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navigationItems.map((item) => {
            if (item.type === 'accordion') {
              const isMaintenanceActive = location.pathname.startsWith('/app/work-orders') ||
                location.pathname.startsWith('/app/teams') ||
                location.pathname.startsWith('/app/maintenance-plans');

              if (isCollapsed) {
                return (
                  <NavLink
                    key="maintenance-group-collapsed"
                    to="/app/work-orders"
                    className={({ isActive }) =>
                      `flex items-center justify-center w-11 h-11 mx-auto rounded-md text-sm font-medium transition-colors group ${
                        isMaintenanceActive
                          ? 'bg-[#0066FF] text-white shadow-none'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                    title="Manutenção"
                  >
                    <Wrench size={18} className="shrink-0" />
                  </NavLink>
                );
              }

              return (
                <div key="maintenance-group-expanded" className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsMaintenanceOpen(!isMaintenanceOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer group ${
                      isMaintenanceActive
                        ? 'text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench size={18} className={`shrink-0 ${isMaintenanceActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      <span className="truncate">Manutenção</span>
                    </div>
                    {isMaintenanceOpen ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
                  </button>

                  {isMaintenanceOpen && (
                    <div className="pl-9 border-l border-white/10 ml-4 space-y-1 my-1">
                      {item.subItems.map((sub: any) => {
                        const SubIcon = sub.icon;
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                                isActive
                                  ? 'bg-[#0066FF] text-white font-semibold shadow-none'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`
                            }
                          >
                            <SubIcon size={15} className="shrink-0" />
                            <span className="truncate">{sub.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center rounded-md text-sm font-medium transition-colors group ${
                    isCollapsed ? 'justify-center w-11 h-11 mx-auto px-0' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#0066FF] text-white shadow-none'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
                title={item.name}
              >
                <Icon 
                  size={18} 
                  className={`shrink-0 transition-transform group-hover:scale-105 duration-150 ${
                    location.pathname.startsWith(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`} 
                />
                
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-white/10 bg-[#0B132B]">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`flex items-center justify-center rounded-md text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto p-0' : 'w-full gap-2 px-3 py-2.5'
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
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[#0B132B] border-r border-white/10 z-50 flex flex-col transition-transform duration-300 transform md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header do Mobile Drawer */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="https://i.postimg.cc/QxqWHtpg/avexas-logo-white.png"
              alt="Avexas CMMS"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="h-10 w-auto object-contain"
              style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            />
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-slate-400 hover:text-white p-1.5 rounded-md transition-all"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links de Navegação Mobile */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            if (item.type === 'accordion') {
              const isMaintenanceActive = location.pathname.startsWith('/app/work-orders') ||
                location.pathname.startsWith('/app/teams') ||
                location.pathname.startsWith('/app/maintenance-plans');

              return (
                <div key="maintenance-group-mobile" className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsMaintenanceOpen(!isMaintenanceOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      isMaintenanceActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench size={18} className="shrink-0" />
                      <span className="truncate">Manutenção</span>
                    </div>
                    {isMaintenanceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {isMaintenanceOpen && (
                    <div className="pl-9 border-l border-white/10 ml-4 space-y-1 my-1">
                      {item.subItems.map((sub: any) => {
                        const SubIcon = sub.icon;
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setIsMobileOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                                isActive
                                  ? 'bg-[#0066FF] text-white font-semibold'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`
                            }
                          >
                            <SubIcon size={16} className="shrink-0" />
                            <span className="truncate">{sub.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0066FF] text-white rounded-md text-sm font-medium shadow-none'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 rounded-md text-sm font-medium transition-colors'
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
        <div className="p-4 border-t border-white/10 bg-[#0B132B]">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (SLATE-50) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Banner de Nova Versão */}
        {hasNewVersion && (
          <div className="bg-[#0066FF] text-white px-4 py-2 flex items-center justify-between text-xs font-medium z-50 shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Uma nova versão do Avexas CMMS está disponível com melhorias e correções.</span>
            </div>
            <button
              onClick={updateApp}
              className="bg-white text-[#0066FF] hover:bg-slate-100 font-bold px-3 py-1 rounded transition-colors cursor-pointer text-xs"
            >
              Atualizar Agora
            </button>
          </div>
        )}

        {/* TOP BAR / CABEÇALHO */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          
          {/* Lado esquerdo: hambúrguer mobile */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-800 p-2 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Lado direito: Notificações, Perfil, Info de Localização Moçambique */}
          <div className="flex items-center gap-3">
            
            {/* Indicador Informativo de Âmbito Operacional */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-700">
              <span className={`w-2 h-2 rounded-full ${isMixedScope ? 'bg-indigo-600' : currentScope === 'plant' ? 'bg-amber-600' : 'bg-blue-600'}`}></span>
              <span>
                {isMixedScope
                  ? 'Frota & Fábrica (Vista Unificada)'
                  : (currentScope === 'plant' || user?.operational_scope === 'plant' ? 'Fábrica / Fabril' : 'Frota')}
              </span>
            </div>



            {/* Botão de Scan QR Code Global (Header) - Apenas ecrã pequeno (smartphones e tablets) e papéis operacionais autorizados (Prompt 3 Requisito 1) */}
            {canScan && (
              <button
                onClick={() => setIsScannerOpen(true)}
                className="lg:hidden p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all border border-blue-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Escanear Equipamento (Código QR)"
              >
                <QrCode size={16} />
                <span>Escanear</span>
              </button>
            )}

            {/* Ícone de Notificações com Dropdown Popover */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  setIsNotificationOpen(prev => {
                    const next = !prev;
                    if (next) fetchNotifications();
                    return next;
                  });
                }}
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
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {uniqueNotifications.length === 0 ? (
                      <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2 border border-slate-200">
                          <Bell size={18} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Sem notificações pendentes.</p>
                      </div>
                    ) : (
                      uniqueNotifications.map((item) => {
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

                  {/* Rodapé do Popover */}
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-center text-[11px] text-slate-400 font-medium">
                    Exibindo as notificações mais recentes
                  </div>
                </div>
              )}
            </div>

            {/* Separador vertical */}
            <span className="w-px h-6 bg-slate-200 hidden md:inline"></span>

            {/* Perfil com Avatar e Nome */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-900">{user.fullName || 'Utilizador'}</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase">{formatRole(user.role)}</span>
              </div>
              <NavLink
                to="/app/profile"
                className={({ isActive }) => 
                  `flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${
                    isActive 
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300'
                  }`
                }
                title="Meu Perfil"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                    {user.fullName ? user.fullName.substring(0, 2) : <User size={16} />}
                    <span
                      title="Clique para adicionar foto"
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white border-2 border-white flex items-center justify-center"
                    >
                      <Camera size={9} />
                    </span>
                  </span>
                )}
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
            {canScan && (
              <button
                onClick={() => setIsScannerOpen(true)}
                className="flex flex-col items-center justify-center -mt-6 bg-blue-700 hover:bg-blue-800 text-white w-14 h-14 rounded-full shadow-md active:scale-95 transition-all border-4 border-slate-50 shrink-0 cursor-pointer"
                aria-label="Escanear QR Code de Campo"
              >
                <QrCode size={22} />
              </button>
            )}

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
