import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sprout, Mail, Lock, User, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-950 relative overflow-hidden">
      <div className="fixed inset-0 bg-mesh" />
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #5a9e58 0%, transparent 70%)' }}
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)' }}
        animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-moss-600 to-moss-500 shadow-glow mb-4">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold">AgriMind</h1>
          <p className="text-gray-500 mt-2">Your AI-powered farming intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-terra-500/10 border border-terra-500/30 text-terra-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-11" placeholder="farmer@example.com" required />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-11" placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-4">
            {loading ? 'Signing in...' : 'Enter Your Farm'}
          </button>

          <p className="text-center text-sm text-gray-500">
            New farmer?{' '}
            <Link to="/register" className="text-moss-400 hover:text-moss-300 font-medium">Create account</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}

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
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-950 relative overflow-hidden">
      <div className="fixed inset-0 bg-mesh" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold">Join AgriMind</h1>
          <p className="text-gray-500 mt-2">Start your smart farming journey</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-4">
          {error && <div className="p-3 rounded-lg bg-terra-500/10 border border-terra-500/30 text-terra-400 text-sm">{error}</div>}

          {[
            { key: 'full_name', label: 'Full Name', icon: User, type: 'text', placeholder: 'Ravi Kumar' },
            { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'ravi@farm.com' },
            { key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: 'Min 6 characters' },
            { key: 'location', label: 'Location', icon: MapPin, type: 'text', placeholder: 'Tamil Nadu, India' },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">{field.label}</label>
              <div className="relative">
                <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="input-field pl-11"
                  placeholder={field.placeholder}
                  required={field.key !== 'location'}
                />
              </div>
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-4 mt-2">
            {loading ? 'Creating...' : 'Create Farm Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already registered? <Link to="/login" className="text-moss-400 hover:text-moss-300 font-medium">Sign in</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
