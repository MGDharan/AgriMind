import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Camera, Cloud, TrendingUp, Sprout, AlertTriangle, ArrowRight,
  Eye, Droplets, BarChart3,
} from 'lucide-react';
import { api } from '../api/client';
import { GlassCard, StatOrb, ConfidenceRing } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const QUICK_ACTIONS = [
  { to: '/scan', icon: Camera, label: 'Scan Crop', desc: 'AI disease detection', color: '#7cb87a' },
  { to: '/weather', icon: Cloud, label: 'Weather', desc: 'Forecast & irrigation', color: '#6eb5d9' },
  { to: '/market', icon: TrendingUp, label: 'Market', desc: 'Price predictions', color: '#d4845c' },
  { to: '/knowledge', icon: Sprout, label: 'Ask AI', desc: 'Agricultural Q&A', color: '#58c4a7' },
];

const AGENTS = [
  { name: 'Vision', icon: Eye, status: 'active' },
  { name: 'Weather', icon: Cloud, status: 'active' },
  { name: 'Irrigation', icon: Droplets, status: 'active' },
  { name: 'Yield', icon: BarChart3, status: 'active' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-sm text-moss-400 font-medium uppercase tracking-widest mb-1">Welcome back</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold">
          {user?.full_name?.split(' ')[0]}'s Farm
        </h2>
        <p className="text-gray-500 mt-2">{user?.location || 'Set your location for local insights'}</p>
      </motion.div>

      {/* Health score hero */}
      <GlassCard glow="moss" className="p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10"
             style={{ background: 'radial-gradient(circle, #5a9e58 0%, transparent 70%)' }} />
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <ConfidenceRing value={Math.round(stats?.health_score ?? 82)} size={120} />
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-display text-2xl font-semibold mb-2">Farm Health Score</h3>
            <p className="text-gray-400 max-w-md">
              Your farm intelligence is {(stats?.health_score ?? 82) >= 80 ? 'thriving' : 'needs attention'}.
              Run a crop scan to get real-time disease and yield insights.
            </p>
            <Link to="/scan" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Camera className="w-4 h-4" /> Scan Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-6">
            <StatOrb value={stats?.total_predictions ?? 0} label="Scans" icon={Camera} color="#7cb87a" delay={0.1} />
            <StatOrb value={stats?.farms_count ?? 0} label="Farms" icon={Sprout} color="#d4a853" delay={0.2} />
            <StatOrb value={stats?.fields_count ?? 0} label="Fields" icon={BarChart3} color="#6eb5d9" delay={0.3} />
          </div>
        </div>
      </GlassCard>

      {/* Quick actions */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, i) => (
            <Link key={action.to} to={action.to}>
              <GlassCard delay={i * 0.05} className="p-5 group cursor-pointer h-full">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                     style={{ background: `${action.color}15` }}>
                  <action.icon className="w-6 h-6" style={{ color: action.color }} />
                </div>
                <h4 className="font-semibold text-gray-200">{action.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Agent status */}
        <GlassCard className="p-6">
          <h3 className="font-display text-lg font-semibold mb-4">AI Agents Online</h3>
          <div className="space-y-3">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-center justify-between p-3 rounded-xl bg-earth-800/30">
                <div className="flex items-center gap-3">
                  <agent.icon className="w-4 h-4 text-moss-400" />
                  <span className="text-sm font-medium">{agent.name} Agent</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-moss-400">
                  <span className="w-2 h-2 rounded-full bg-moss-500 animate-pulse" />
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Alerts */}
        <GlassCard className="p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Farm Alerts</h3>
          <div className="space-y-3">
            {(stats?.recent_alerts ?? ['Run your first crop scan']).map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-wheat-500/5 border border-wheat-500/10">
                <AlertTriangle className="w-4 h-4 text-wheat-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300">{alert}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
