import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

// ── GlassCard ─────────────────────────────────────────────────────────────────
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  glow?: 'moss' | 'wheat' | 'none';
  onClick?: () => void;
}

export function GlassCard({ children, className = '', delay = 0, glow = 'none', onClick }: GlassCardProps) {
  const glowClass = glow === 'moss' ? 'hover:shadow-glow' : glow === 'wheat' ? 'hover:shadow-glow-wheat' : '';
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`glass-panel-hover ${glowClass} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── Card3D — 3D tilt on mouse hover ──────────────────────────────────────────
interface Card3DProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  intensity?: number;
}

export function Card3D({ children, className = '', delay = 0, intensity = 12 }: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 20 });
  const sy = useSpring(y, { stiffness: 200, damping: 20 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top)  / rect.height - 0.5);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800 }}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      className={`glass-panel transition-shadow duration-300 hover:shadow-glass-lg hover:border-moss-600/30 ${className}`}
    >
      <div style={{ transform: 'translateZ(8px)' }}>{children}</div>
    </motion.div>
  );
}

// ── AnimatedNumber — smooth count-up ─────────────────────────────────────────
export function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) { setDisplay(end); return; }
    const step = (end - start) / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else { setDisplay(Math.round(start)); }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

// ── StatOrb ───────────────────────────────────────────────────────────────────
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
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay, type: 'spring', stiffness: 200, damping: 15 }}
      className="relative flex flex-col items-center"
    >
      {/* Outer glow ring */}
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
           style={{ background: `radial-gradient(circle, ${color}25 0%, transparent 70%)` }}>
        {/* Spinning orbit */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full"
          style={{ border: `1px solid ${color}20` }}
        />
        <div className="absolute inset-3 rounded-full"
             style={{ border: `1px dashed ${color}15` }} />
        <div className="text-center z-10">
          <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
          <div className="text-2xl font-display font-bold" style={{ color }}>
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </div>
        </div>
      </div>
      <span className="text-xs text-gray-400 mt-2 font-medium tracking-wide uppercase">{label}</span>
    </motion.div>
  );
}

// ── RiskBadge ─────────────────────────────────────────────────────────────────
export function RiskBadge({ risk }: { risk: string }) {
  const level = risk.toLowerCase();
  const cls = level === 'high' ? 'risk-high' : level === 'medium' ? 'risk-medium' : 'risk-low';
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`agent-badge border ${cls}`}
    >
      {risk} Risk
    </motion.span>
  );
}

// ── ConfidenceRing ────────────────────────────────────────────────────────────
export function ConfidenceRing({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#7cb87a' : value >= 60 ? '#d4a853' : '#d4845c';
  const trackColor = value >= 80 ? 'rgba(90,158,88,0.12)' : value >= 60 ? 'rgba(212,168,83,0.12)' : 'rgba(192,103,59,0.12)';

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 rounded-full"
           style={{ background: `radial-gradient(circle, ${trackColor} 0%, transparent 70%)` }} />
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
                stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        {/* Progress */}
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold" style={{ color, fontSize: size * 0.175 }}>{value}%</span>
      </div>
    </motion.div>
  );
}

// ── AgentTag ──────────────────────────────────────────────────────────────────
const AGENT_COLORS: Record<string, string> = {
  vision:            '#7cb87a',
  weather:           '#6eb5d9',
  soil:              '#d4a853',
  irrigation:        '#5b9bd5',
  yield:             '#b8892e',
  market:            '#d4845c',
  government_scheme: '#9b7ed9',
  rag:               '#58c4a7',
};

const AGENT_LABELS: Record<string, string> = {
  vision:            'Vision',
  weather:           'Weather',
  soil:              'Soil',
  irrigation:        'Irrigation',
  yield:             'Yield',
  market:            'Market',
  government_scheme: 'Schemes',
  rag:               'Knowledge',
};

export function AgentTag({ agent }: { agent: string }) {
  const color = AGENT_COLORS[agent] || '#7cb87a';
  const label = AGENT_LABELS[agent] || agent;
  return (
    <span className="agent-badge" style={{ borderColor: `${color}40`, color }}>
      <motion.span
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        className="w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel overflow-hidden ${className}`}>
      <div className="skeleton h-full w-full" />
    </div>
  );
}

// ── GlowDot — animated status indicator ──────────────────────────────────────
export function GlowDot({ color = '#7cb87a', size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <motion.span
        animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
      />
      <span className="rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  );
}

export { AGENT_COLORS, AGENT_LABELS };
