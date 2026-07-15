import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Users, Map, Sprout, Activity, Store, AlertCircle, Loader2, Search, Power, ArrowRight, ShieldCheck, ReceiptText, ServerCog
} from 'lucide-react';
import { api, AdminFarmerResponse } from '../api/client';
import { Card3D, GlassCard, GlowDot, StatOrb } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { timeAgo } from '../lib/utils';

// ── Admin Login Page ─────────────────────────────────────────────────────────

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in and is_admin, redirect to /admin
  useEffect(() => {
    if (user?.is_admin) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.admin.login({ email, password });
      login(res.user, res.access_token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-950 p-4">
      <Card3D className="w-full max-w-md p-8 relative overflow-hidden" intensity={15}>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-moss-500/20 rounded-full blur-[80px]" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-earth-800/80 border border-earth-700/50 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-8 h-8 text-moss-400" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-gray-100">Admin Portal</h1>
            <p className="text-gray-500 text-sm mt-2">Sign in to manage AgriMind</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-terra-500/10 border border-terra-500/20 flex items-center gap-2 text-terra-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="admin@agrimind.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center items-center py-2.5 mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Portal'}
            </button>
          </form>
        </div>
      </Card3D>
    </div>
  );
}

// ── Admin Dashboard Page ─────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'farmers' | 'activity' | 'market' | 'orders' | 'logs'>('overview');

  if (!user?.is_admin) {
    return <Navigate to="/admin/login" />;
  }

  return (
    <div className="min-h-screen bg-earth-950 text-gray-200">
      {/* Top Navbar */}
      <header className="border-b border-earth-800/50 bg-earth-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-moss-400" />
            <h1 className="font-display font-bold text-xl text-gray-100 tracking-wide">AgriMind Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-earth-800/80 transition-colors"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {[
            { id: 'overview', icon: Activity, label: 'Overview' },
            { id: 'farmers', icon: Users, label: 'Farmers' },
            { id: 'activity', icon: Activity, label: 'Global Activity' },
            { id: 'market', icon: Store, label: 'Marketplace' },
            { id: 'orders', icon: ReceiptText, label: 'Orders' },
            { id: 'logs', icon: ServerCog, label: 'System Logs' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-moss-500/10 text-moss-400 border border-moss-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-earth-800/50 border border-transparent'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'farmers' && <FarmersTab />}
          {activeTab === 'activity' && <ActivityTab />}
          {activeTab === 'market' && <MarketTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'logs' && <LogsTab />}
        </div>
      </main>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['adminStats'], queryFn: api.admin.stats });

  if (isLoading) return <div className="text-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Platform Overview</h2>
        <p className="text-gray-500 text-sm">Real-time statistics across the entire AgriMind network.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatOrb value={stats?.total_farmers ?? 0} label="Farmers" icon={Users} color="#6eb5d9" delay={0.1} />
        <StatOrb value={stats?.total_farms ?? 0} label="Farms" icon={Map} color="#d4a853" delay={0.2} />
        <StatOrb value={stats?.total_fields ?? 0} label="Fields" icon={Sprout} color="#7cb87a" delay={0.3} />
        <StatOrb value={stats?.total_scans ?? 0} label="Crop Scans" icon={Activity} color="#d4845c" delay={0.4} />
        <StatOrb value={stats?.total_listings ?? 0} label="Market Listings" icon={Store} color="#a882dd" delay={0.5} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 pt-4">
        <GlassCard className="p-6">
          <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-moss-400" /> System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-earth-800/30">
              <span className="text-sm text-gray-400">Database</span>
              <div className="flex items-center gap-2">
                <GlowDot color="#7cb87a" size={6} />
                <span className="text-xs text-moss-400">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-earth-800/30">
              <span className="text-sm text-gray-400">AI Models (Ollama)</span>
              <div className="flex items-center gap-2">
                <GlowDot color="#7cb87a" size={6} />
                <span className="text-xs text-moss-400">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-earth-800/30">
              <span className="text-sm text-gray-400">Vector Store (Qdrant)</span>
              <div className="flex items-center gap-2">
                <GlowDot color="#7cb87a" size={6} />
                <span className="text-xs text-moss-400">Online</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function FarmersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: farmers, isLoading } = useQuery({ queryKey: ['adminFarmers'], queryFn: api.admin.farmers });

  const toggleMut = useMutation({
    mutationFn: api.admin.toggleFarmer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminFarmers'] }),
  });

  const filtered = farmers?.filter(f => 
    f.full_name.toLowerCase().includes(search.toLowerCase()) || 
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Registered Farmers</h2>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search farmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading farmers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-earth-900/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Farmer</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium text-center">Farms</th>
                  <th className="px-6 py-4 font-medium text-center">Fields</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-800/50">
                {filtered?.map((f) => (
                  <tr key={f.id} className="hover:bg-earth-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-200">{f.full_name}</div>
                      <div className="text-xs text-gray-500">{f.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{f.location || '-'}</td>
                    <td className="px-6 py-4 text-center text-gray-300">{f.farms_count}</td>
                    <td className="px-6 py-4 text-center text-gray-300">{f.fields_count}</td>
                    <td className="px-6 py-4 text-gray-400">{new Date(f.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        f.is_active ? 'bg-moss-500/10 text-moss-400 border border-moss-500/20' : 'bg-terra-500/10 text-terra-400 border border-terra-500/20'
                      }`}>
                        <GlowDot color={f.is_active ? "#7cb87a" : "#d45c5c"} size={4} />
                        {f.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleMut.mutate(f.id)}
                        disabled={toggleMut.isPending}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        {f.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No farmers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function ActivityTab() {
  const { data: activity, isLoading } = useQuery({ queryKey: ['adminActivity'], queryFn: api.admin.activity, refetchInterval: 10000 });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Global Activity Feed</h2>
      <GlassCard className="p-6">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading activity...</div>
        ) : (
          <div className="space-y-4">
            {activity?.map((act) => (
              <div key={act.id} className="flex items-start gap-4 p-4 rounded-xl bg-earth-800/30 border border-earth-700/50">
                <div className="w-10 h-10 rounded-xl bg-earth-700/50 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {act.user_email} <span className="text-gray-500 font-normal">used</span> {act.agent}
                    </p>
                    <span className="text-xs text-gray-500 shrink-0">{timeAgo(act.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{act.input_summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function MarketTab() {
  const { data: listings, isLoading } = useQuery({ queryKey: ['adminListings'], queryFn: api.admin.listings });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Marketplace Listings</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Loading listings...</div>
        ) : listings?.map((l) => (
          <GlassCard key={l.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="px-2 py-1 bg-earth-800/80 rounded border border-earth-700 text-xs font-medium text-wheat-400 uppercase tracking-wider">
                {l.crop}
              </span>
              <span className="text-xs text-gray-500">{timeAgo(l.created_at)}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-2xl font-bold text-gray-100">₹{l.price_per_kg}</span>
              <span className="text-sm text-gray-500">/kg</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Quantity</span>
                <span className="text-gray-200">{l.quantity_kg} kg</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Seller</span>
                <span className="text-gray-200 truncate max-w-[120px]" title={l.seller_email}>{l.seller_name}</span>
              </div>
            </div>
          </GlassCard>
        ))}
        {listings?.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No active listings in the marketplace.
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersTab() {
  const { data: orders, isLoading } = useQuery({ queryKey: ['adminOrders'], queryFn: api.admin.orders });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Marketplace Orders</h2>
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading orders...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-earth-900/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Crop</th>
                  <th className="px-6 py-4 font-medium">Quantity / Price</th>
                  <th className="px-6 py-4 font-medium">Buyer</th>
                  <th className="px-6 py-4 font-medium">Seller</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-800/50">
                {orders?.map((o) => (
                  <tr key={o.id} className="hover:bg-earth-800/20 transition-colors">
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">#{o.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-200 capitalize">{o.crop}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-200">{o.quantity_kg} kg</div>
                      <div className="text-xs text-gray-500">@ ₹{o.price_per_kg}/kg (Total: ₹{o.quantity_kg * o.price_per_kg})</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-200">{o.buyer_name}</div>
                      <div className="text-xs text-gray-500">{o.buyer_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-200">{o.seller_name}</div>
                      <div className="text-xs text-gray-500">{o.seller_email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {orders?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function LogsTab() {
  const { data: logs, isLoading } = useQuery({ queryKey: ['adminLogs'], queryFn: api.admin.logs, refetchInterval: 5000 });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <ServerCog className="w-6 h-6 text-gray-400" /> System Logs (Agents)
      </h2>
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-earth-900/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Session ID</th>
                  <th className="px-6 py-4 font-medium">Agent</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium">Latency</th>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-800/50">
                {logs?.map((l) => (
                  <tr key={l.id} className="hover:bg-earth-800/20 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{l.coordinator_session}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-moss-500/10 rounded border border-moss-500/20 text-xs font-medium text-moss-400">
                        {l.agent_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{l.action}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs ${l.latency_ms > 5000 ? 'text-terra-400' : l.latency_ms > 2000 ? 'text-wheat-400' : 'text-moss-400'}`}>
                        {l.latency_ms.toFixed(0)} ms
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                      {new Date(l.created_at).toISOString().split('T')[1].split('.')[0]}
                    </td>
                  </tr>
                ))}
                {logs?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No logs available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
