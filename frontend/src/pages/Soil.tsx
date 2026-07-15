import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Loader2, MapPin, Upload, X, TrendingUp, TrendingDown, Minus,
  Leaf, Droplets, AlertTriangle, CheckCircle2, Brain, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart, Bar,
} from 'recharts';
import { api, NDVIAnalysis } from '../api/client';
import { GlassCard, RiskBadge, ConfidenceRing } from '../components/ui';

// ── Soil Lab ────────────────────────────────────────────────────────────────
export function SoilPage() {
  const [form, setForm] = useState({ nitrogen: 45, phosphorus: 30, potassium: 35, ph: 6.5, crop: 'Tomato' });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try { const res = await api.soil(form); setResult(res); }
    finally { setLoading(false); }
  };

  const fields = [
    { key: 'nitrogen',   label: 'Nitrogen (N)',   min: 0, max: 200, unit: 'kg/ha' },
    { key: 'phosphorus', label: 'Phosphorus (P)',  min: 0, max: 200, unit: 'kg/ha' },
    { key: 'potassium',  label: 'Potassium (K)',   min: 0, max: 200, unit: 'kg/ha' },
    { key: 'ph',         label: 'pH Level',        min: 4, max: 9, step: 0.1, unit: '' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-3xl font-bold">Soil Laboratory</h2>
        <p className="text-gray-500 mt-1">Analyze nutrients · predict field health · get AI recommendations</p>
      </div>

      {/* NPK Sliders */}
      <div className="grid lg:grid-cols-2 gap-8">
        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <FlaskConical className="w-5 h-5 text-wheat-400" />
            <h3 className="font-display font-semibold">Soil Test Values</h3>
          </div>
          {fields.map((f) => (
            <div key={f.key}>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-400">{f.label}</label>
                <span className="text-sm font-mono text-moss-400">
                  {form[f.key as keyof typeof form]}{f.unit && ` ${f.unit}`}
                </span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step ?? 1}
                value={form[f.key as keyof typeof form] as number}
                onChange={(e) => setForm({ ...form, [f.key]: parseFloat(e.target.value) })}
                className="w-full accent-moss-500" />
            </div>
          ))}
          <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} className="input-field">
            {['Tomato', 'Rice', 'Wheat', 'Potato'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <button onClick={analyze} disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FlaskConical className="w-5 h-5" />}
            Analyze Soil
          </button>
        </GlassCard>

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard glow="wheat" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg">Analysis Result</h3>
                <ConfidenceRing value={Math.round(result.confidence as number)} />
              </div>
              <RiskBadge risk={result.risk as string} />
              <div className="mt-4 space-y-3">
                <div><p className="text-xs text-gray-500 uppercase">Problem</p>
                  <p className="text-gray-200">{result.problem as string}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">Recommendation</p>
                  <p className="text-moss-400 leading-relaxed">{result.recommendation as string}</p></div>
                {(result.deficiencies as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(result.deficiencies as string[]).map((d: string) => (
                      <span key={d} className="agent-badge risk-medium border">{d}</span>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* NDVI Intelligence Section */}
      <NDVISection />
    </div>
  );
}

// ── NDVI Health Badge ────────────────────────────────────────────────────────
function HealthBadge({ health, score }: { health: string; score: number }) {
  const color = health === 'Excellent' ? '#7cb87a'
    : health === 'Good'     ? '#5a9e58'
    : health === 'Moderate' ? '#d4a853'
    : health === 'Stressed' ? '#d4845c'
    : '#c0673b';
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg width={64} height={64} className="-rotate-90">
          <circle cx={32} cy={32} r={26} fill="none" stroke="#1a2420" strokeWidth={5} />
          <circle cx={32} cy={32} r={26} fill="none" stroke={color} strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 26}
            strokeDashoffset={2 * Math.PI * 26 * (1 - score / 100)}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <p className="font-display font-semibold" style={{ color }}>{health}</p>
        <p className="text-xs text-gray-500">Field Health</p>
      </div>
    </div>
  );
}

// ── Trend Icon ───────────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-moss-400" />;
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-terra-400" />;
  return <Minus className="w-4 h-4 text-wheat-400" />;
}

// ── Custom chart tooltip ─────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-3 border border-earth-700/80 shadow-glass-lg space-y-1.5 min-w-[120px]">
      <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: p.color }} />
            {p.name.replace(/ \(.*\)/, '')}
          </span>
          <span className="font-mono font-bold" style={{ color: p.color }}>
            {Number(p.value).toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── NDVI Section ─────────────────────────────────────────────────────────────
function NDVISection() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NDVIAnalysis | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError('');
  }, []);  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.ndvi.analyze(file);
      if (res.error) setError(res.error);
      else setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Merge historical + forecast for the chart
  const chartData = result ? [
    ...result.historical.map(d => ({
      date: d.date.slice(5),
      ndvi_actual: d.ndvi_actual,
      ndmi_actual: d.ndmi_actual,
      ndvi_pred:   d.ndvi_pred,
      ndmi_pred:   d.ndmi_pred,
      msavi_pred:  d.msavi_pred,
      type: 'historical',
    })),
    ...result.forecast.map(d => ({
      date: d.date.slice(5),
      ndvi_forecast: d.ndvi_pred,
      ndmi_forecast: d.ndmi_pred,
      type: 'forecast',
    })),
  ] : [];

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 pb-2 border-b border-earth-700/50">
        <Brain className="w-6 h-6 text-moss-400" />
        <div>
          <h3 className="font-display text-xl font-semibold">Field Intelligence — NDVI / NDMI Forecast</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload your field NDVI &amp; NDMI data (CSV or Excel) — XGBoost predicts the next 30 days
            and tells you what to do
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Upload Field Data</p>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 group
              ${file ? 'border-moss-600/40' : 'border-earth-600 hover:border-moss-600/30'}`}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.zip" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-moss-400" />
                  <span className="text-gray-300 truncate max-w-[140px]">{file.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                  className="p-1 text-gray-500 hover:text-gray-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-earth-600 mx-auto mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-spring" />
                <p className="text-sm text-gray-400">Drop data.zip or CSV/Excel here</p>
                <p className="text-xs text-gray-600 mt-1">ZIP (Warwan) · CSV · XLSX</p>
              </div>
            )}
          </div>

          {/* Format hint */}
          <div className="p-3 rounded-xl bg-earth-800/40 border border-earth-700/50 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-400">Accepted formats:</p>
            <p>• <code className="text-moss-400">data.zip</code> — Warwan dataset (all 3 indices)</p>
            <p>• <code className="text-moss-400">.xlsx / .csv</code> — single file with date + ndvi columns</p>
            <p className="text-gray-600 mt-1">Zip must contain NDVI, NDMI & MSAVI Excel files</p>
          </div>

          <button onClick={analyze} disabled={!file || loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Training XGBoost...</>
              : <><Brain className="w-4 h-4" /> Predict 30-Day Trend</>
            }
          </button>

          {error && (
            <p className="text-terra-400 text-xs flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {result && (
            <div className="text-xs text-gray-600 space-y-0.5">
              <p>NDVI model R²: <span className="text-moss-400">{(result.model_r2_ndvi * 100).toFixed(1)}%</span></p>
              <p>NDMI model R²: <span className="text-moss-400">{(result.model_r2_ndmi * 100).toFixed(1)}%</span></p>
              <p>MSAVI model R²: <span className="text-moss-400">{(result.model_r2_msavi * 100).toFixed(1)}%</span></p>
              <p>Training samples: <span className="text-wheat-400">{result.training_samples}</span></p>
              <p>Inference: {result.latency_ms.toFixed(0)}ms</p>
            </div>
          )}
        </GlassCard>

        {/* Summary + health */}
        {result && (
          <div className="lg:col-span-2 space-y-4">
            <GlassCard glow="moss" className="p-5">
              <div className="flex items-start gap-5 flex-wrap">
                <HealthBadge health={result.current_health} score={result.health_score} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Leaf className="w-3 h-3 text-moss-400" />
                      <span className="text-gray-400">NDVI</span>
                      <span className="font-mono text-moss-400">{result.current_ndvi.toFixed(3)}</span>
                      <TrendIcon trend={result.ndvi_trend} />
                      <span className="text-gray-600">{result.ndvi_trend}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3 h-3 text-sky-400" />
                      <span className="text-gray-400">NDMI</span>
                      <span className="font-mono text-sky-400">{result.current_ndmi.toFixed(3)}</span>
                      <TrendIcon trend={result.ndmi_trend} />
                      <span className="text-gray-600">{result.ndmi_trend}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-3 h-3 text-wheat-400" />
                      <span className="text-gray-400">MSAVI</span>
                      <span className="font-mono text-wheat-400">{result.current_msavi.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Suggestions */}
            <GlassCard className="p-5">
              <h4 className="font-display font-semibold mb-3 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-moss-400" /> AI Recommendations
              </h4>
              <div className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -16, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 100 }}
                    whileHover={{ scale: 1.01, borderColor: 'rgba(124, 184, 122, 0.25)' }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-earth-800/40 border border-earth-700/50 transition-all duration-300">
                    <span className="w-5 h-5 rounded-full bg-moss-600/20 border border-moss-600/30
                      text-moss-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-300 leading-relaxed">{s}</p>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Charts */}
      {result && chartData.length > 0 && (
        <div className="space-y-4">
          {/* NDVI chart */}
          <GlassCard className="p-5">
            <h4 className="font-display font-semibold mb-4 text-sm flex items-center gap-2">
              <Leaf className="w-4 h-4 text-moss-400" />
              NDVI History + 30-Day Forecast
              <span className="ml-auto text-xs text-gray-500 font-normal">
                {result.historical.length} historical days · 30 forecast days
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243029" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }}
                  interval={Math.floor(chartData.length / 8)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[-0.1, 0.7]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <ReferenceLine y={0} stroke="#2f3d35" />
                <ReferenceLine y={0.2} stroke="#d4a853" strokeDasharray="4 4" label={{ value: 'Stressed', fontSize: 9, fill: '#d4a853', position: 'right' }} />
                <ReferenceLine y={0.4} stroke="#7cb87a" strokeDasharray="4 4" label={{ value: 'Good', fontSize: 9, fill: '#7cb87a', position: 'right' }} />
                <Area type="monotone" dataKey="ndvi_actual" stroke="#7cb87a" fill="#7cb87a22"
                  dot={false} name="NDVI (actual)" strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="ndvi_pred" stroke="#d4a853" strokeDasharray="3 2"
                  dot={false} name="NDVI (model)" strokeWidth={1.5} connectNulls />
                <Line type="monotone" dataKey="ndvi_forecast" stroke="#9b7ed9" strokeDasharray="5 3"
                  dot={false} name="NDVI (forecast)" strokeWidth={2} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* NDMI chart */}
          <GlassCard className="p-5">
            <h4 className="font-display font-semibold mb-4 text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-400" />
              NDMI Moisture History + 30-Day Forecast
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243029" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }}
                  interval={Math.floor(chartData.length / 8)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[-0.4, 0.5]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <ReferenceLine y={0} stroke="#2f3d35" />
                <ReferenceLine y={-0.1} stroke="#d4845c" strokeDasharray="4 4" label={{ value: 'Water stress', fontSize: 9, fill: '#d4845c', position: 'right' }} />
                <Area type="monotone" dataKey="ndmi_actual" stroke="#6eb5d9" fill="#6eb5d922"
                  dot={false} name="NDMI (actual)" strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="ndmi_pred" stroke="#5b9bd5" strokeDasharray="3 2"
                  dot={false} name="NDMI (model)" strokeWidth={1.5} connectNulls />
                <Line type="monotone" dataKey="ndmi_forecast" stroke="#9b7ed9" strokeDasharray="5 3"
                  dot={false} name="NDMI (forecast)" strokeWidth={2} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Forecast table — next 7 days */}
          <GlassCard className="p-5">
            <h4 className="font-display font-semibold mb-3 text-sm">7-Day Forecast Detail</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-earth-700/50">
                    {['Date', 'NDVI', 'Health', 'NDMI', 'Moisture Status'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-gray-500 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.forecast.slice(0, 7).map((row, i) => {
                    const ndviColor = row.ndvi_pred >= 0.4 ? '#7cb87a' : row.ndvi_pred >= 0.2 ? '#d4a853' : '#d4845c';
                    const ndmiColor = row.ndmi_pred >= 0.1 ? '#6eb5d9' : row.ndmi_pred >= -0.1 ? '#d4a853' : '#d4845c';
                    return (
                      <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-earth-800/50 hover:bg-earth-800/30 transition-colors">
                        <td className="py-2 px-3 text-gray-400">{new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="py-2 px-3 font-mono" style={{ color: ndviColor }}>{row.ndvi_pred.toFixed(3)}</td>
                        <td className="py-2 px-3" style={{ color: ndviColor }}>{row.ndvi_health}</td>
                        <td className="py-2 px-3 font-mono" style={{ color: ndmiColor }}>{row.ndmi_pred.toFixed(3)}</td>
                        <td className="py-2 px-3" style={{ color: ndmiColor }}>{row.ndmi_status}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// Irrigation planner has been removed. The Soil page remains.
