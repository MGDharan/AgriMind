import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Camera, Cloud, FlaskConical,
  TrendingUp, Building2, BookOpen, History,
  LogOut, Sprout, Menu, X, MapPin, ShoppingCart, Package,
  MessageSquareMore,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { InteractiveBackground } from './InteractiveBackground';

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard,  label: 'Dashboard',    color: '#34d399' },
  { to: '/advisor',   icon: MessageSquareMore, label: 'AI Advisor',   color: '#a78bfa', badge: 'AI' },
  { to: '/scan',      icon: Camera,            label: 'Crop Scan',    color: '#fb923c' },
  { to: '/weather',   icon: Cloud,             label: 'Weather',      color: '#60a5fa' },
  { to: '/soil',      icon: FlaskConical,      label: 'Soil Lab',     color: '#f59e0b' },
  { to: '/market',    icon: TrendingUp,        label: 'Market',       color: '#f59e0b' },
  { to: '/trade',     icon: ShoppingCart,      label: 'Buy / Sell',   color: '#10b981' },
  { to: '/orders',    icon: Package,           label: 'Orders',       color: '#8b5cf6' },
  { to: '/schemes',   icon: Building2,         label: 'Schemes',      color: '#f59e0b' },
  { to: '/farms',     icon: MapPin,            label: 'My Farms',     color: '#34d399' },
  { to: '/knowledge', icon: BookOpen,          label: 'Knowledge',    color: '#10b981' },
  { to: '/history',   icon: History,           label: 'History',      color: '#6b7280' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-earth-700/40">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', boxShadow: '0 4px 16px rgba(52,211,153,0.4)' }}>
            <Sprout className="w-5 h-5 text-white relative z-10" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-xl opacity-30"
              style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)' }}
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-gradient">AgriMind</h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">AI Intelligence</p>
          </div>
        </motion.div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group"
                style={isActive ? {
                  background: `${item.color}12`,
                  color: item.color,
                  border: `1px solid ${item.color}25`,
                  boxShadow: `0 0 16px ${item.color}15`,
                } : {
                  color: '#9ca3af',
                  border: '1px solid transparent',
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeBar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: item.color }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon
                  className="w-4 h-4 transition-all duration-300 ease-spring group-hover:scale-120 group-hover:rotate-[6deg]"
                  style={{ color: isActive ? item.color : undefined }}
                />
                <span className="transition-transform duration-300 group-hover:translate-x-1 flex-1">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
                    {item.badge}
                  </span>
                )}
                {/* Hover shimmer */}
                {!isActive && (
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }} />
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-earth-700/40">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 bg-earth-800/40 border border-earth-700/30 hover:border-moss-600/30 transition-all duration-300"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-moss-400 shrink-0"
               style={{ background: 'rgba(90,158,88,0.15)', border: '1px solid rgba(90,158,88,0.2)' }}>
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
          </div>
        </motion.div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-500
                     hover:text-terra-400 hover:bg-earth-800/50 transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-earth-950">
      {/* Interactive Background */}
      <InteractiveBackground />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30 rounded-none"
             style={{ background: 'rgba(8,8,26,0.85)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(30,30,58,0.6)' }}>
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between"
           style={{ background: 'rgba(4,4,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,30,58,0.5)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 2px 10px rgba(52,211,153,0.4)' }}>
            <Sprout className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-gradient">AgriMind</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          style={{ background: 'rgba(30,44,38,0.5)' }}
        >
          <AnimatePresence mode="wait">
            {mobileOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}><X className="w-5 h-5" /></motion.div>
              : <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}><Menu className="w-5 h-5" /></motion.div>
            }
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 z-50 rounded-none"
              style={{ background: 'rgba(4,4,15,0.97)', backdropFilter: 'blur(32px)', borderRight: '1px solid rgba(30,30,58,0.6)' }}
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 md:p-8 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
