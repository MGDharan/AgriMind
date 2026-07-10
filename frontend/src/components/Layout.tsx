import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Camera, Cloud, FlaskConical, Droplets,
  TrendingUp, Building2, BookOpen, History, LogOut, Sprout, Menu, X, MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scan', icon: Camera, label: 'Crop Scan' },
  { to: '/weather', icon: Cloud, label: 'Weather' },
  { to: '/soil', icon: FlaskConical, label: 'Soil Lab' },
  { to: '/irrigation', icon: Droplets, label: 'Irrigation' },
  { to: '/market', icon: TrendingUp, label: 'Market' },
  { to: '/schemes', icon: Building2, label: 'Schemes' },
  { to: '/farms', icon: MapPin, label: 'My Farms' },
  { to: '/knowledge', icon: BookOpen, label: 'Knowledge' },
  { to: '/history', icon: History, label: 'History' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-earth-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-moss-600 to-moss-500 flex items-center justify-center shadow-glow">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight">AgriMind</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-moss-600/15 text-moss-400 border border-moss-600/20 shadow-glow'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-earth-800/50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-earth-700/50">
        <div className="px-4 py-3 mb-2">
          <p className="text-sm font-medium text-gray-200 truncate">{user?.full_name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-terra-400 hover:bg-earth-800/50 transition-all">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-earth-950">
      <div className="fixed inset-0 bg-mesh pointer-events-none" />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 left-0 z-30 glass-panel border-r border-earth-700/50 rounded-none">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-panel border-b border-earth-700/50 rounded-none px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-moss-500" />
          <span className="font-display font-bold">AgriMind</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-400">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 glass-panel border-r border-earth-700/50 rounded-none"
        >
          {sidebar}
        </motion.aside>
      )}

      <main className="flex-1 lg:ml-72 pt-16 lg:pt-0 relative z-10">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
