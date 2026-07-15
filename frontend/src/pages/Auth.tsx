import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Sprout, Mail, Lock, User, MapPin, Eye, EyeOff, ArrowRight, Leaf, Zap, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// ── Typewriter cycling headlines ───────────────────────────────────────────────
const HEADLINES = ['Grow Smarter.', 'Farm Intelligently.', 'Harvest More.', 'Think Ahead.'];

function TypewriterText() {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pause' | 'erasing'>('typing');

  useEffect(() => {
    const target = HEADLINES[index];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (displayed.length < target.length) {
        timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 70);
      } else {
        timeout = setTimeout(() => setPhase('pause'), 1800);
      }
    } else if (phase === 'pause') {
      timeout = setTimeout(() => setPhase('erasing'), 300);
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
      } else {
        setIndex((i) => (i + 1) % HEADLINES.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, phase, index]);

  return (
    <span className="text-gradient font-display">
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-0.5 h-8 ml-1 bg-moss-400 rounded-full align-middle"
      />
    </span>
  );
}

// ── Floating orb field ────────────────────────────────────────────────────────
function FloatingOrbs() {
  const orbs = Array.from({ length: 8 }, (_, i) => ({
    size: 60 + Math.random() * 120,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 8 + Math.random() * 10,
    delay: Math.random() * 5,
    color: i % 3 === 0 ? 'rgba(52,211,153,0.12)' : i % 3 === 1 ? 'rgba(245,158,11,0.08)' : 'rgba(139,92,246,0.08)',
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
          }}
          animate={{
            x: [0, 40 - Math.random() * 80, 0],
            y: [0, 40 - Math.random() * 80, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: orb.duration, repeat: Infinity, delay: orb.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Grid dots background ──────────────────────────────────────────────────────
function GridDots() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(52,211,153,0.4) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    />
  );
}

// ── Animated 3D leaf/DNA helix ────────────────────────────────────────────────
function AnimatedHeroVisual() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [15, -15]), { stiffness: 100, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-15, 15]), { stiffness: 100, damping: 20 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const dots = Array.from({ length: 16 }, (_, i) => i);
  const features = [
    { icon: Leaf, label: 'Crop Intelligence', color: '#34d399' },
    { icon: Zap, label: 'AI Powered', color: '#f59e0b' },
    { icon: Shield, label: 'Secure & Reliable', color: '#a78bfa' },
  ];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      className="relative w-full h-full flex flex-col items-center justify-center select-none"
      style={{ perspective: 1000 }}
    >
      {/* 3D rotating sphere cluster */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative w-56 h-56 flex items-center justify-center"
      >
        {/* Central glowing orb */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 40px rgba(52,211,153,0.3)', '0 0 80px rgba(52,211,153,0.6)', '0 0 40px rgba(52,211,153,0.3)'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-28 h-28 rounded-full flex items-center justify-center relative z-10"
          style={{ background: 'radial-gradient(circle at 35% 35%, #34d399, #059669, #04040f)', border: '1px solid rgba(52,211,153,0.5)' }}
        >
          <Sprout className="w-12 h-12 text-white drop-shadow-lg" />
        </motion.div>

        {/* Orbiting dots ring 1 */}
        {dots.slice(0, 8).map((_, i) => {
          const angle = (i / 8) * 360;
          return (
            <motion.div
              key={`r1-${i}`}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: i % 2 === 0 ? '#34d399' : '#f59e0b',
                boxShadow: `0 0 8px ${i % 2 === 0 ? '#34d399' : '#f59e0b'}`,
                top: '50%', left: '50%',
                marginTop: -6, marginLeft: -6,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: 0 }}
              transformTemplate={({ rotate }) =>
                `rotate(${rotate}) translateX(90px) rotate(-${rotate})`
              }
            />
          );
        })}

        {/* Orbiting dots ring 2 (reverse) */}
        {dots.slice(0, 6).map((_, i) => (
          <motion.div
            key={`r2-${i}`}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: '#a78bfa',
              boxShadow: '0 0 6px #a78bfa',
              top: '50%', left: '50%',
              marginTop: -4, marginLeft: -4,
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            transformTemplate={({ rotate }) =>
              `rotate(${rotate}) translateX(118px) rotate(-${rotate})`
            }
          />
        ))}

        {/* Glowing ring 1 */}
        <div className="absolute w-52 h-52 rounded-full border border-moss-500/20" style={{ boxShadow: 'inset 0 0 20px rgba(52,211,153,0.05)' }} />
        {/* Glowing ring 2 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute w-44 h-44 rounded-full"
          style={{ border: '1px dashed rgba(52,211,153,0.2)' }}
        />
      </motion.div>

      {/* Feature pills below sphere */}
      <div className="flex flex-col gap-3 mt-10 w-64">
        {features.map(({ icon: Icon, label, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.15 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
            <span className="text-sm font-medium text-gray-300">{label}</span>
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              className="w-1.5 h-1.5 rounded-full ml-auto"
              style={{ background: color }}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Floating particles ────────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    x: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 6,
    color: i % 3 === 0 ? '#34d399' : i % 3 === 1 ? '#f59e0b' : '#a78bfa',
    startY: 80 + Math.random() * 20,
  }));
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full login-particle"
          style={{
            width: p.size, height: p.size,
            left: `${p.x}%`,
            bottom: `${100 - p.startY}%`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
          animate={{ y: [0, -(100 + Math.random() * 200)], opacity: [0.8, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Input field with animated focus ──────────────────────────────────────────
function FormInput({
  label, type = 'text', value, onChange, placeholder, icon: Icon, showToggle = false,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  icon: React.ElementType; showToggle?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputType = showToggle ? (show ? 'text' : 'password') : type;
  return (
    <div>
      <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block font-medium">{label}</label>
      <div className="relative group">
        <motion.div
          animate={{ color: focused ? '#34d399' : '#4b5563' }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors"
        >
          <Icon className="w-4 h-4" />
        </motion.div>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="input-field pl-11 pr-11"
          placeholder={placeholder}
          required
        />
        {focused && (
          <motion.div
            layoutId={`focus-ring-${label}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, #34d399, #059669)' }}
          />
        )}
        {showToggle && (
          <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setLoading(true);
      loginWithToken(token)
        .then(() => { setSearchParams({}); navigate('/'); })
        .catch((e) => setError(e instanceof Error ? e.message : 'Google login failed'))
        .finally(() => setLoading(false));
    }
  }, [loginWithToken, navigate, searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-earth-950 relative overflow-hidden">
      {/* Animated background layers */}
      <div className="fixed inset-0 bg-mesh" />
      <GridDots />
      <FloatingOrbs />
      <Particles />

      {/* LEFT PANEL — hero visual (desktop only) */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col flex-1 items-center justify-center relative z-10 p-12"
      >
        {/* Headline */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #059669, #34d399)',
                boxShadow: '0 8px 32px rgba(52,211,153,0.4), 0 0 60px rgba(52,211,153,0.15)',
              }}
            >
              <Sprout className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h1 className="font-display text-3xl font-bold text-gradient">AgriMind</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Intelligence</p>
            </div>
          </motion.div>

          <div className="h-12 flex items-center justify-center overflow-hidden">
            <h2 className="font-display text-4xl font-bold">
              <TypewriterText />
            </h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-500 mt-4 max-w-sm"
          >
            Harness the power of AI to transform your farming operations. Real-time insights, precision agriculture, smarter decisions.
          </motion.p>
        </div>

        <AnimatedHeroVisual />
      </motion.div>

      {/* Vertical divider */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-earth-600/50 to-transparent relative z-10" />

      {/* RIGHT PANEL — auth form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8 lg:hidden"
          >
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 6px 24px rgba(52,211,153,0.4)' }}>
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold text-gradient">AgriMind</h1>
            </div>
          </motion.div>

          {/* Form card */}
          <motion.div
            className="glass-panel p-8 space-y-5 login-glow-ring"
            style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-gray-500 text-sm">Sign in to your farm dashboard</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl text-terra-400 text-sm"
                  style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {[
                { label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'farmer@example.com', icon: Mail },
                { label: 'Password', value: password, onChange: setPassword, placeholder: '••••••••', icon: Lock, showToggle: true },
              ].map((field) => (
                <motion.div
                  key={field.label}
                  variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.4 }}
                >
                  <FormInput {...field} />
                </motion.div>
              ))}
            </motion.div>

            {/* Sign in button */}
            <motion.button
              type="button"
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02, boxShadow: '0 8px 40px rgba(16,185,129,0.5)' }}
              whileTap={{ scale: loading ? 1 : 0.97 }}
              className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                <>Enter Your Farm <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-earth-700/60" />
              <span className="text-xs text-gray-600">or</span>
              <div className="flex-1 h-px bg-earth-700/60" />
            </div>

            {/* Google button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { window.location.href = '/api/auth/google/login'; }}
              className="btn-secondary w-full py-3.5 flex items-center justify-center gap-3 text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </motion.button>

            <p className="text-center text-sm text-gray-500 pt-1">
              New farmer?{' '}
              <Link to="/register" className="text-moss-400 hover:text-moss-300 font-medium transition-colors">
                Create account
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', location: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await register(form); navigate('/'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Registration failed'); }
    finally { setLoading(false); }
  };

  const FIELDS = [
    { key: 'full_name', label: 'Full Name',  icon: User,   type: 'text',     placeholder: 'Ravi Kumar'        },
    { key: 'email',     label: 'Email',       icon: Mail,   type: 'email',    placeholder: 'ravi@farm.com'     },
    { key: 'password',  label: 'Password',    icon: Lock,   type: 'password', placeholder: 'Min 6 characters', toggle: true },
    { key: 'location',  label: 'Location',    icon: MapPin, type: 'text',     placeholder: 'Tamil Nadu, India' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-950 relative overflow-hidden py-8">
      <div className="fixed inset-0 bg-mesh" />
      <GridDots />
      <FloatingOrbs />
      <Particles />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 8px 32px rgba(52,211,153,0.4)' }}
          >
            <Sprout className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-gradient">Join AgriMind</h1>
          <p className="text-gray-500 mt-2 text-sm">Start your smart farming journey</p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="glass-panel p-8 space-y-4 login-glow-ring"
          style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl text-terra-400 text-sm"
                style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {FIELDS.map((field, i) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
            >
              <FormInput
                label={field.label}
                type={field.type}
                value={form[field.key as keyof typeof form]}
                onChange={(v) => setForm({ ...form, [field.key]: v })}
                placeholder={field.placeholder}
                icon={field.icon}
                showToggle={field.toggle}
              />
            </motion.div>
          ))}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2 mt-2"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
              : <>Create Farm Account <ArrowRight className="w-4 h-4" /></>
            }
          </motion.button>

          <p className="text-center text-sm text-gray-500">
            Already registered?{' '}
            <Link to="/login" className="text-moss-400 hover:text-moss-300 font-medium transition-colors">Sign in</Link>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
