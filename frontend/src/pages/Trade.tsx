import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, TrendingUp, Package, Search, Filter, Upload, X,
  CheckCircle, AlertCircle, Wheat, Leaf, ChevronDown, Phone,
  MapPin, Scale, IndianRupee, ArrowUpRight, ArrowDownRight,
  Star, Clock, Eye, Zap, BarChart2, RefreshCw, User
} from 'lucide-react';
import { api, ListingResponse } from '../api/client';

// ── Crop config with emojis, colors, and live-ish price ranges ────────────────
const CROP_CONFIG: Record<string, { emoji: string; color: string; basePrice: number; unit: string }> = {
  tomato:   { emoji: '🍅', color: '#ef4444', basePrice: 28,  unit: 'kg' },
  rice:     { emoji: '🌾', color: '#f59e0b', basePrice: 42,  unit: 'kg' },
  wheat:    { emoji: '🌿', color: '#d97706', basePrice: 24,  unit: 'kg' },
  potato:   { emoji: '🥔', color: '#8b5cf6', basePrice: 18,  unit: 'kg' },
  corn:     { emoji: '🌽', color: '#10b981', basePrice: 22,  unit: 'kg' },
  onion:    { emoji: '🧅', color: '#fb923c', basePrice: 35,  unit: 'kg' },
  soybean:  { emoji: '🫘', color: '#6ee7b7', basePrice: 48,  unit: 'kg' },
  cotton:   { emoji: '☁️',  color: '#a78bfa', basePrice: 65,  unit: 'kg' },
  sugarcane:{ emoji: '🎋', color: '#34d399', basePrice: 3.5, unit: 'kg' },
  groundnut:{ emoji: '🥜', color: '#fbbf24', basePrice: 55,  unit: 'kg' },
};
const CROPS = Object.keys(CROP_CONFIG);

// ── Simulated market ticker data ───────────────────────────────────────────────
function useTicker() {
  const [tickers, setTickers] = useState(() =>
    CROPS.slice(0, 6).map(c => ({
      crop: c,
      price: CROP_CONFIG[c].basePrice + (Math.random() * 6 - 3),
      change: (Math.random() * 8 - 4),
    }))
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTickers(prev => prev.map(t => ({
        ...t,
        price: Math.max(1, t.price + (Math.random() * 2 - 1)),
        change: t.change + (Math.random() * 0.5 - 0.25),
      })));
    }, 3000);
    return () => clearInterval(id);
  }, []);
  return tickers;
}

// ── Market Ticker strip ────────────────────────────────────────────────────────
function MarketTicker() {
  const tickers = useTicker();
  const doubled = [...tickers, ...tickers];
  return (
    <div className="relative overflow-hidden rounded-xl py-3 px-0"
         style={{ background: 'rgba(8,8,26,0.9)', border: '1px solid rgba(30,30,58,0.8)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10"
           style={{ background: 'linear-gradient(90deg, rgba(8,8,26,1), transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10"
           style={{ background: 'linear-gradient(270deg, rgba(8,8,26,1), transparent)' }} />
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="flex gap-8 w-max"
      >
        {doubled.map((t, i) => {
          const cfg = CROP_CONFIG[t.crop];
          const up = t.change >= 0;
          return (
            <div key={i} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base">{cfg.emoji}</span>
              <span className="text-xs font-semibold text-gray-200 uppercase">{t.crop}</span>
              <span className="text-xs font-bold" style={{ color: cfg.color }}>
                ₹{t.price.toFixed(1)}
              </span>
              <span className={`text-[10px] flex items-center gap-0.5 ${up ? 'text-moss-400' : 'text-terra-400'}`}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(t.change).toFixed(2)}%
              </span>
              <span className="text-earth-600">•</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.02 }}
      className="glass-panel p-5 flex items-center gap-4"
      style={{ border: `1px solid ${color}18` }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="font-display font-bold text-xl text-white">{value}</p>
        <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}

// ── Listing card ───────────────────────────────────────────────────────────────
function ListingCard({ listing, onBuy, index }: {
  listing: ListingResponse;
  onBuy: (l: ListingResponse) => void;
  index: number;
}) {
  const cfg = CROP_CONFIG[listing.crop] ?? { emoji: '🌱', color: '#34d399', unit: 'kg' };
  const totalValue = (listing.price_per_kg * listing.quantity_kg).toFixed(0);
  const [viewed, setViewed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="glass-panel overflow-hidden group cursor-default"
      style={{ border: `1px solid ${cfg.color}15` }}
    >
      {/* Top accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.15 }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}
            >
              {listing.image_path
                ? <img src={listing.image_path} alt={listing.crop} className="w-full h-full object-cover rounded-2xl" />
                : cfg.emoji
              }
            </motion.div>
            <div>
              <h3 className="font-display font-bold text-base text-white capitalize">{listing.crop}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="w-3 h-3 text-gray-600" />
                <span className="text-[11px] text-gray-500">{listing.seller_name ?? 'Local Farmer'}</span>
              </div>
            </div>
          </div>
          <motion.div
            animate={{ boxShadow: [`0 0 8px ${cfg.color}30`, `0 0 18px ${cfg.color}60`, `0 0 8px ${cfg.color}30`] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
          >
            LIVE
          </motion.div>
        </div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Price / kg</p>
            <div className="flex items-baseline gap-0.5">
              <IndianRupee className="w-3.5 h-3.5 text-moss-400 mt-0.5" />
              <span className="font-display font-bold text-2xl text-moss-400">{listing.price_per_kg}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Available</p>
            <div className="flex items-baseline gap-1">
              <Scale className="w-3.5 h-3.5 text-wheat-400 mt-0.5" />
              <span className="font-display font-bold text-2xl text-wheat-400">{listing.quantity_kg}</span>
              <span className="text-xs text-gray-600">kg</span>
            </div>
          </div>
        </div>

        {/* Total value */}
        <div className="flex items-center justify-between mb-4 p-2.5 rounded-lg"
             style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}>
          <span className="text-xs text-gray-500">Total Listing Value</span>
          <span className="text-sm font-bold text-moss-400">₹{parseInt(totalValue).toLocaleString('en-IN')}</span>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-600" />
            <span className="text-[10px] text-gray-600">
              {new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-2.5 h-2.5" style={{ color: s <= 4 ? '#f59e0b' : '#374151' }} fill={s <= 4 ? '#f59e0b' : 'none'} />)}
          </div>
        </div>

        {/* Buy button */}
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(16,185,129,0.4)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setViewed(true); onBuy(listing); }}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <ShoppingCart className="w-4 h-4" />
          Buy Now
          <Zap className="w-3 h-3 opacity-70" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Buy Modal ─────────────────────────────────────────────────────────────────
function BuyModal({ listing, onClose, onSuccess }: {
  listing: ListingResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', qty: '1' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const cfg = CROP_CONFIG[listing.crop] ?? { emoji: '🌱', color: '#34d399', unit: 'kg' };

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.phone || !form.address) { setError('Please fill all fields'); return; }
    const qty = parseFloat(form.qty);
    if (isNaN(qty) || qty <= 0 || qty > listing.quantity_kg) { setError(`Quantity must be 1–${listing.quantity_kg} kg`); return; }
    setLoading(true); setError('');
    try {
      await api.purchase({ listing_id: listing.id, buyer_name: form.name, buyer_phone: form.phone, buyer_address: form.address, quantity_kg: qty });
      setDone(true);
      setTimeout(onSuccess, 1800);
    } catch (e: any) { setError(e.message || 'Purchase failed'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,4,15,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel w-full max-w-md overflow-hidden"
        style={{ border: `1px solid ${cfg.color}25`, boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 40px ${cfg.color}12` }}
      >
        {/* Header */}
        <div className="p-5 border-b border-earth-700/40 flex items-center justify-between"
             style={{ background: `linear-gradient(135deg, ${cfg.color}08, transparent)` }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cfg.emoji}</span>
            <div>
              <h3 className="font-display font-bold text-white capitalize">Buy {listing.crop}</h3>
              <p className="text-xs text-gray-500">₹{listing.price_per_kg}/kg · {listing.quantity_kg}kg available</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-earth-800/60 transition-colors text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              >
                <CheckCircle className="w-16 h-16 text-moss-400" />
              </motion.div>
              <h4 className="font-display font-bold text-xl text-white">Order Placed!</h4>
              <p className="text-gray-500 text-sm text-center">Your purchase request has been sent to the seller. They will contact you shortly.</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="p-5 space-y-4">
              {/* Quantity selector */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Quantity (kg)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => set('qty')(String(Math.max(1, parseInt(form.qty || '1') - 1)))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>−</button>
                  <input
                    type="number" value={form.qty} onChange={e => set('qty')(e.target.value)}
                    className="input-field text-center font-bold text-lg flex-1"
                    min="1" max={listing.quantity_kg}
                  />
                  <button onClick={() => set('qty')(String(Math.min(listing.quantity_kg, parseInt(form.qty || '1') + 1)))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>+</button>
                </div>
              </div>

              {/* Total cost */}
              <div className="flex items-center justify-between p-3 rounded-xl"
                   style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                <span className="text-sm text-gray-400">Total Cost</span>
                <span className="font-display font-bold text-moss-400 text-lg">
                  ₹{(listing.price_per_kg * (parseFloat(form.qty) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Fields */}
              {[
                { key: 'name', label: 'Your Full Name', icon: User, placeholder: 'Ravi Kumar' },
                { key: 'phone', label: 'Phone Number', icon: Phone, placeholder: '+91 98765 43210' },
                { key: 'address', label: 'Delivery Address', icon: MapPin, placeholder: 'Village, District, State' },
              ].map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                    <input
                      className="input-field pl-10"
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={e => set(key as keyof typeof form)(e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="text-xs text-terra-400 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(16,185,129,0.4)' }}
                whileTap={{ scale: 0.97 }}
                onClick={submit}
                disabled={loading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing Order...</>
                  : <><CheckCircle className="w-4 h-4" /> Confirm Purchase</>
                }
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ── Sell Form ──────────────────────────────────────────────────────────────────
function SellForm({ onSuccess }: { onSuccess: () => void }) {
  const [crop, setCrop] = useState('tomato');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const cfg = CROP_CONFIG[crop];
  const totalValue = price && quantity ? (parseFloat(price) * parseFloat(quantity)) : 0;

  const handleFile = (f: File) => {
    setImage(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!price || !quantity) { setError('Enter price and quantity'); return; }
    setLoading(true); setError('');
    const form = new FormData();
    form.append('crop', crop);
    form.append('price_per_kg', price);
    form.append('quantity_kg', quantity);
    if (image) form.append('file', image);
    try {
      await api.createListing(form);
      setSuccess(true);
      setPrice(''); setQuantity(''); setImage(null); setPreview(null);
      qc.invalidateQueries({ queryKey: ['listings'] });
      onSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to create listing');
    } finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left — form */}
      <div className="glass-panel p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #059669, #34d399)' }}>
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white">Create Listing</h3>
            <p className="text-[11px] text-gray-500">Post your crop for sale</p>
          </div>
        </div>

        {/* Crop picker */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Select Crop</label>
          <div className="grid grid-cols-5 gap-2">
            {CROPS.map(c => {
              const cc = CROP_CONFIG[c];
              return (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setCrop(c)}
                  className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-200"
                  style={crop === c ? {
                    background: `${cc.color}18`,
                    border: `1px solid ${cc.color}40`,
                    boxShadow: `0 0 12px ${cc.color}20`,
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-lg">{cc.emoji}</span>
                  <span className="text-[9px] text-gray-500 capitalize">{c.slice(0, 4)}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected crop info */}
        <motion.div
          key={crop}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
        >
          <span className="text-2xl">{cfg.emoji}</span>
          <div>
            <p className="font-bold text-white capitalize">{crop}</p>
            <p className="text-xs text-gray-500">Market rate: ₹{cfg.basePrice}/kg</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-gray-600">Suggested</p>
            <p className="text-sm font-bold" style={{ color: cfg.color }}>₹{cfg.basePrice}–{cfg.basePrice + 8}</p>
          </div>
        </motion.div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Price (₹/kg)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
              <input value={price} onChange={e => setPrice(e.target.value)} type="number"
                     className="input-field pl-9" placeholder="e.g. 30" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Quantity (kg)</label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
              <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number"
                     className="input-field pl-9" placeholder="e.g. 100" />
            </div>
          </div>
        </div>

        {/* Total value preview */}
        <AnimatePresence>
          {totalValue > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl flex items-center justify-between"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}
            >
              <span className="text-xs text-gray-500">Estimated listing value</span>
              <span className="font-display font-bold text-moss-400">
                ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-xs text-terra-400 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: loading ? 1 : 1.02, boxShadow: '0 8px 30px rgba(16,185,129,0.4)' }}
          whileTap={{ scale: 0.97 }}
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Posting...</>
            : success
              ? <><CheckCircle className="w-4 h-4" /> Listed Successfully!</>
              : <><TrendingUp className="w-4 h-4" /> Post Listing</>
          }
        </motion.button>
      </div>

      {/* Right — image upload + preview */}
      <div className="space-y-4">
        <div
          className="glass-panel p-6 flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all duration-300 min-h-[200px]"
          style={{ border: preview ? `1px solid ${cfg.color}30` : '1px dashed rgba(255,255,255,0.1)' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
                 onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {preview ? (
            <div className="relative w-full">
              <img src={preview} alt="preview" className="w-full h-44 object-cover rounded-xl" />
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={e => { e.stopPropagation(); setImage(null); setPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-earth-900/90 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          ) : (
            <>
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Upload className="w-5 h-5 text-gray-500" />
              </motion.div>
              <p className="text-sm text-gray-500 text-center">Drop crop photo here<br /><span className="text-xs text-gray-700">or click to browse</span></p>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="glass-panel p-4 space-y-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-wheat-400" /> Seller Tips
          </p>
          {[
            'Set price 5–10% above market rate to leave room for negotiation',
            'Upload a clear photo to get 3x more buyer interest',
            'Verify your phone number so buyers can reach you faster',
          ].map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex gap-2.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-wheat-400 mt-1.5 shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TradePage() {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [cropFilter, setCropFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [buyTarget, setBuyTarget] = useState<ListingResponse | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest'>('newest');
  const [showFilter, setShowFilter] = useState(false);

  const fetchListings = async () => {
    setLoadingList(true);
    try {
      const crop = cropFilter === 'all' ? undefined : cropFilter;
      const res = await api.listListings(crop);
      setListings(res);
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  };

  useEffect(() => { fetchListings(); }, [cropFilter]);

  const filtered = listings
    .filter(l => !search || l.crop.toLowerCase().includes(search.toLowerCase()) || (l.seller_name ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price_per_kg - b.price_per_kg;
      if (sortBy === 'price_desc') return b.price_per_kg - a.price_per_kg;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalVolume = listings.reduce((s, l) => s + l.quantity_kg, 0);
  const avgPrice = listings.length ? (listings.reduce((s, l) => s + l.price_per_kg, 0) / listings.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 4px 20px rgba(52,211,153,0.4)' }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h1 className="page-title">Crop Marketplace</h1>
          </div>
          <p className="text-gray-500 text-sm">Buy directly from farmers · Zero middlemen · Real-time pricing</p>
        </div>

        {/* Tab switcher */}
        <div className="md:ml-auto flex p-1 rounded-2xl gap-1"
             style={{ background: 'rgba(8,8,26,0.8)', border: '1px solid rgba(30,30,58,0.8)' }}>
          {(['buy', 'sell'] as const).map(t => (
            <motion.button
              key={t}
              onClick={() => setTab(t)}
              className="relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize"
              style={{ color: tab === t ? '#fff' : '#6b7280' }}
            >
              {tab === t && (
                <motion.div
                  layoutId="tabBg"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: t === 'buy' ? 'linear-gradient(135deg, #059669, #34d399)' : 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {t === 'buy' ? <ShoppingCart className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                {t === 'buy' ? 'Buy Crops' : 'Sell Crops'}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Live market ticker */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-2 mb-2">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-moss-400" />
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">Live Market Prices</span>
        </div>
        <MarketTicker />
      </motion.div>

      {/* Stats row (buy tab only) */}
      <AnimatePresence>
        {tab === 'buy' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <StatCard icon={Package} label="Active Listings" value={String(listings.length)} sub="Available now" color="#34d399" />
            <StatCard icon={Scale} label="Total Volume" value={`${totalVolume.toLocaleString('en-IN')} kg`} sub="Across all crops" color="#f59e0b" />
            <StatCard icon={IndianRupee} label="Avg. Price" value={`₹${avgPrice.toFixed(1)}/kg`} sub="Across all listings" color="#a78bfa" />
            <StatCard icon={BarChart2} label="Crops Listed" value={String(new Set(listings.map(l => l.crop)).size)} sub="Different varieties" color="#fb923c" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'sell' ? (
          <motion.div key="sell" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            <SellForm onSuccess={fetchListings} />
          </motion.div>
        ) : (
          <motion.div key="buy" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }} className="space-y-5">
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  className="input-field pl-10"
                  placeholder="Search crops or sellers..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Crop filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCropFilter('all')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                  style={cropFilter === 'all' ? {
                    background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)',
                  } : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  All Crops
                </motion.button>
                {CROPS.slice(0, 6).map(c => {
                  const cc = CROP_CONFIG[c];
                  return (
                    <motion.button
                      key={c}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCropFilter(c)}
                      className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5"
                      style={cropFilter === c ? {
                        background: `${cc.color}15`, color: cc.color, border: `1px solid ${cc.color}30`,
                      } : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {cc.emoji} <span className="capitalize">{c}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Sort */}
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="input-field pr-8 text-xs appearance-none cursor-pointer"
                  style={{ paddingRight: '2rem' }}
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={fetchListings}
                disabled={loadingList}
                className="p-2.5 rounded-xl transition-all shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingList ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            {/* Results count */}
            {!loadingList && (
              <p className="text-xs text-gray-600">
                Showing <span className="text-gray-400 font-medium">{filtered.length}</span> listings
                {cropFilter !== 'all' && <> for <span className="text-gray-400 capitalize">{cropFilter}</span></>}
              </p>
            )}

            {/* Listings grid */}
            {loadingList ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                              className="glass-panel h-72 skeleton" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-12 text-center"
              >
                <span className="text-5xl mb-4 block">🌾</span>
                <h3 className="font-display font-bold text-white mb-2">No listings found</h3>
                <p className="text-gray-500 text-sm">Be the first to list this crop!</p>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTab('sell')}
                  className="btn-primary mt-5 px-6"
                >
                  Start Selling
                </motion.button>
              </motion.div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((l, i) => (
                  <ListingCard key={l.id} listing={l} index={i} onBuy={setBuyTarget} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Modal */}
      <AnimatePresence>
        {buyTarget && (
          <BuyModal
            listing={buyTarget}
            onClose={() => setBuyTarget(null)}
            onSuccess={() => { setBuyTarget(null); fetchListings(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
