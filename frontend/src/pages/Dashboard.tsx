import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Camera, Cloud, TrendingUp, Sprout, AlertTriangle, ArrowRight,
  Eye, Droplets, BarChart3, Zap, Activity, Brain,
} from 'lucide-react';
import { api } from '../api/client';
import { Card3D, GlassCard, StatOrb, ConfidenceRing, GlowDot, AnimatedNumber } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const QUICK_ACTIONS = [
  { to: '/scan',      icon: Camera,     label: 'Scan Crop',    desc: 'AI disease detection',  color: '#d4845c', bg: 'rgba(212,132,92,0.08)'  },
  { to: '/weather',   icon: Cloud,      label: 'Weather',      desc: 'Forecast & irrigation', color: '#6eb5d9', bg: 'rgba(110,181,217,0.08)' },
  { to: '/market',    icon: TrendingUp, label: 'Market',       desc: 'Price predictions',     color: '#d4a853', bg: 'rgba(212,168,83,0.08)'  },
  { to: '/knowledge', icon: Brain,      label: 'Ask AI',       desc: 'Agricultural Q&A',      color: '#58c4a7', bg: 'rgba(88,196,167,0.08)'  },
];

const AGENTS = [
  {
    name: 'Vision AI',
    icon: Eye,
    color: '#7cb87a',
    desc: 'Disease detection',
    animate: { scale: [1, 1.15, 1, 1, 1], rotate: [0, 0, 10, -10, 0] },
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
  },
  {
    name: 'Weather',
    icon: Cloud,
    color: '#6eb5d9',
    desc: 'Live forecast',
    animate: { y: [0, -3, 0], x: [0, 2, 0] },
    transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
  },
  {
    name: 'Irrigation',
    icon: Droplets,
    color: '#5b9bd5',
    desc: 'Water scheduling',
    animate: { scale: [1, 1.15, 0.95, 1], y: [0, 2, -1, 0] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    color: '#d4a853',
    desc: 'Yield prediction',
    animate: { scaleY: [1, 1.25, 0.9, 1.15, 1] },
    transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' }
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const score = Math.round(stats?.health_score ?? 82);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Hero greeting */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-moss-400/80 font-medium uppercase tracking-widest mb-1 flex items-center gap-2">
          <GlowDot color="#7cb87a" size={6} />
          Welcome back
        </p>
        <h2 className="font-display text-4xl md:text-5xl font-bold">
          <span className="text-gradient">{user?.full_name?.split(' ')[0]}</span>
          <span className="text-gray-200">'s Farm</span>
        </h2>
        <p className="text-gray-500 mt-2 text-sm">
          {user?.location || 'Set your location for personalised insights'}
        </p>
      </motion.div>

      {/* Health score hero card */}
      <motion.div variants={itemVariants}>
        <div className="glass-panel p-6 md:p-8 relative overflow-hidden"
             style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(124,184,122,0.06), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

          {/* Decorative bg orbs */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.07] pointer-events-none"
               style={{ background: 'radial-gradient(circle, #5a9e58 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-[0.05] pointer-events-none"
               style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Confidence ring with glow */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full opacity-20 animate-pulse-slow"
                   style={{ background: `radial-gradient(circle, #7cb87a 0%, transparent 70%)`, transform: 'scale(1.3)' }} />
              <ConfidenceRing value={score} size={130} />
            </div>

            <div className="flex-1 text-center md:text-left">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Farm Health Score</p>
              <h3 className="font-display text-2xl font-semibold mb-2 text-gray-100">
                Your farm is{' '}
                <span style={{ color: score >= 80 ? '#7cb87a' : '#d4a853' }}>
                  {score >= 80 ? 'thriving' : 'needs attention'}
                </span>
              </h3>
              <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                Run a crop scan to get real-time disease detection, yield forecasts, and personalised treatment plans.
              </p>
              <Link to="/scan"
                    className="btn-primary inline-flex items-center gap-2 mt-5 text-sm">
                <Camera className="w-4 h-4" /> Scan Now <ArrowRight className="w-4 h-4 animate-float-slow" />
              </Link>
            </div>

            {/* Stat orbs */}
            <div className="flex gap-6 md:gap-8">
              <StatOrb value={stats?.total_predictions ?? 0} label="Scans"  icon={Camera}    color="#7cb87a" delay={0.15} />
              <StatOrb value={stats?.farms_count ?? 0}       label="Farms"  icon={Sprout}    color="#d4a853" delay={0.25} />
              <StatOrb value={stats?.fields_count ?? 0}      label="Fields" icon={BarChart3} color="#6eb5d9" delay={0.35} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick action 3D cards */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-moss-400" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, i) => (
            <Link key={action.to} to={action.to}>
              <Card3D delay={0.15 + i * 0.05} className="p-5 h-full cursor-pointer hover:border-moss-500/20" intensity={10}>
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform"
                  style={{ background: action.bg, border: `1px solid ${action.color}20` }}
                  whileHover={{ scale: 1.15, rotate: 4 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                >
                  <action.icon className="w-6 h-6" style={{ color: action.color }} />
                </motion.div>
                <h4 className="font-semibold text-gray-100 text-sm">{action.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: action.color }}>
                  Open <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Card3D>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Agents + Alerts */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">

        {/* AI Agents online */}
        <GlassCard className="p-6" delay={0.4}>
          <h3 className="font-display text-base font-semibold mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-moss-400" />
            AI Agents Online
          </h3>
          <div className="space-y-2">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl transition-all duration-300 cursor-default group hover:border-moss-600/30 hover:bg-earth-800/40 hover:-translate-y-0.5 hover:shadow-glow-sm"
                style={{ background: 'rgba(22,32,28,0.6)', border: '1px solid rgba(30,44,38,0.5)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                       style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}20` }}>
                    <motion.div animate={agent.animate} transition={agent.transition}>
                      <agent.icon className="w-4 h-4" style={{ color: agent.color }} />
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{agent.name}</p>
                    <p className="text-[10px] text-gray-600">{agent.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GlowDot color={agent.color} size={6} />
                  <span className="text-xs capitalize font-medium" style={{ color: agent.color }}>active</span>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* Farm Alerts */}
        <GlassCard className="p-6 shadow-glass" delay={0.5}>
          <h3 className="font-display text-base font-semibold mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-wheat-400" />
            Farm Alerts
          </h3>
          <div className="space-y-3">
            {(stats?.recent_alerts ?? ['Run your first crop scan to get started']).map((alert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.06 }}
                className="flex items-start gap-3 p-3 rounded-xl hover:border-wheat-500/20 border border-transparent transition-all duration-300"
                style={{ background: 'rgba(212,168,83,0.05)', border: '1px solid rgba(212,168,83,0.12)' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                     style={{ background: 'rgba(212,168,83,0.1)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 text-wheat-400 animate-pulse" />
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{alert}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
