import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, IndianRupee, MapPin, Calendar } from 'lucide-react';
import { api, MarketData } from '../api/client';
import { GlassCard, RiskBadge, ConfidenceRing } from '../components/ui';

const CROPS = ['tomato', 'rice', 'wheat', 'potato'];

export function MarketPage() {
  const [crop, setCrop] = useState('tomato');
  const { data, isLoading } = useQuery({
    queryKey: ['market', crop],
    queryFn: () => api.market(crop),
  });

  const TrendIcon = data?.trend === 'Rising' ? TrendingUp : data?.trend === 'Falling' ? TrendingDown : Minus;
  const trendColor = data?.trend === 'Rising' ? '#7cb87a' : data?.trend === 'Falling' ? '#d4845c' : '#d4a853';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold">Market Intelligence</h2>
        <p className="text-gray-500 mt-1">Price predictions and optimal selling strategies</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CROPS.map((c) => (
          <button key={c} onClick={() => setCrop(c)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
              crop === c ? 'bg-wheat-500/15 text-wheat-400 border border-wheat-500/30' : 'bg-earth-800/50 text-gray-400 border border-earth-600'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <GlassCard className="p-12 text-center text-gray-500">Analyzing market data...</GlassCard>
      ) : data ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GlassCard glow="wheat" className="p-8 md:col-span-2 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 opacity-10">
              <IndianRupee className="w-48 h-48 text-wheat-400" />
            </div>
            <div className="relative z-10">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Predicted Price</p>
              <div className="flex items-end gap-3 mt-2">
                <span className="text-5xl font-display font-bold text-wheat-400">₹{data.predicted_price_per_kg}</span>
                <span className="text-lg text-gray-500 mb-2">/kg</span>
                <div className="flex items-center gap-1 mb-2 ml-4" style={{ color: trendColor }}>
                  <TrendIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{data.trend}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-6">
                <ConfidenceRing value={Math.round(data.confidence)} size={60} />
                <RiskBadge risk={data.risk} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <MapPin className="w-5 h-5 text-moss-400 mb-3" />
            <p className="text-xs text-gray-500 uppercase">Best Market</p>
            <p className="font-semibold text-gray-200 mt-1">{data.best_market}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <Calendar className="w-5 h-5 text-wheat-400 mb-3" />
            <p className="text-xs text-gray-500 uppercase">Best Selling Date</p>
            <p className="font-semibold text-gray-200 mt-1">{data.best_selling_date}</p>
          </GlassCard>

          <GlassCard className="p-6 md:col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Recommendation</p>
            <p className="text-moss-400 leading-relaxed">{data.recommendation}</p>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

export function SchemesPage() {
  const [crop, setCrop] = useState('Tomato');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const CROPS = ['Tomato', 'Rice', 'Wheat', 'Potato', 'Corn', 'Cotton'];

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const res = await api.predict({ crop, latitude: 13.0827, longitude: 80.2707 });
      const scheme = res.insights.find((i) => i.agent === 'government_scheme');
      setResult(scheme?.details ?? null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold">Government Schemes</h2>
          <p className="text-gray-500 mt-1">Subsidies, insurance, and support programs</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {CROPS.map((c) => (
              <button
                key={c}
                onClick={() => setCrop(c)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                  crop === c
                    ? 'bg-wheat-500/15 text-wheat-400 border border-wheat-500/30'
                    : 'bg-earth-800/50 text-gray-400 border border-earth-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button onClick={fetchSchemes} disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Find Schemes'}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <GlassCard className="p-6">
            <p className="text-moss-400">{result.recommendation as string}</p>
          </GlassCard>
          <div className="grid md:grid-cols-2 gap-4">
            {(result.schemes as Array<Record<string, string>>)?.map((scheme, i) => (
              <motion.div key={scheme.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="p-5 h-full">
                  <h4 className="font-display font-semibold text-wheat-400">{scheme.name}</h4>
                  <p className="text-sm text-gray-400 mt-2">{scheme.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="agent-badge border text-moss-400">{scheme.benefit}</span>
                    <span className="agent-badge border text-gray-400">{scheme.eligibility}</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
