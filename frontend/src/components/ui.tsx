import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  glow?: 'moss' | 'wheat' | 'none';
}

export function GlassCard({ children, className = '', delay = 0, glow = 'none' }: GlassCardProps) {
  const glowClass = glow === 'moss' ? 'hover:shadow-glow' : glow === 'wheat' ? 'hover:shadow-glow-wheat' : '';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-panel-hover ${glowClass} ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface StatOrbProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export function StatOrb({ value, label, icon: Icon, color, delay = 0 }: StatOrbProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay, type: 'spring' }}
      className="relative flex flex-col items-center"
    >
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
           style={{ background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }}>
        <div className="absolute inset-2 rounded-full border border-white/5 animate-pulse-slow" />
        <div className="text-center z-10">
          <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
          <div className="text-2xl font-display font-bold" style={{ color }}>{value}</div>
        </div>
      </div>
      <span className="text-xs text-gray-400 mt-2 font-medium tracking-wide uppercase">{label}</span>
    </motion.div>
  );
}

interface RiskBadgeProps {
  risk: string;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  const level = risk.toLowerCase();
  const cls = level === 'high' ? 'risk-high' : level === 'medium' ? 'risk-medium' : 'risk-low';
  return <span className={`agent-badge border ${cls}`}>{risk} Risk</span>;
}

interface ConfidenceRingProps {
  value: number;
  size?: number;
}

export function ConfidenceRing({ value, size = 80 }: ConfidenceRingProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#7cb87a' : value >= 60 ? '#d4a853' : '#d4845c';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a2420" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{value}%</span>
      </div>
    </div>
  );
}

const AGENT_COLORS: Record<string, string> = {
  vision: '#7cb87a',
  weather: '#6eb5d9',
  soil: '#d4a853',
  irrigation: '#5b9bd5',
  yield: '#b8892e',
  market: '#d4845c',
  government_scheme: '#9b7ed9',
  rag: '#58c4a7',
};

const AGENT_LABELS: Record<string, string> = {
  vision: 'Vision',
  weather: 'Weather',
  soil: 'Soil',
  irrigation: 'Irrigation',
  yield: 'Yield',
  market: 'Market',
  government_scheme: 'Schemes',
  rag: 'Knowledge',
};

export function AgentTag({ agent }: { agent: string }) {
  const color = AGENT_COLORS[agent] || '#7cb87a';
  const label = AGENT_LABELS[agent] || agent;
  return (
    <span className="agent-badge" style={{ borderColor: `${color}40`, color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export { AGENT_COLORS, AGENT_LABELS };
