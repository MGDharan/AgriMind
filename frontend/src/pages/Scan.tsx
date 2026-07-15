import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, X, Loader2, MapPin,
  AlertTriangle, CheckCircle2, ShieldAlert, Leaf,
} from 'lucide-react';
import { api, CoordinatorResponse } from '../api/client';
import { GlassCard, ConfidenceRing, RiskBadge } from '../components/ui';

// ── Disease result card ────────────────────────────────────────────────────

const cardItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

function DiseaseCard({ result }: { result: CoordinatorResponse }) {
  const insight = result.insights[0];
  if (!insight) return null;

  const details = insight.details as Record<string, unknown>;
  const disease = details.disease as string | null;
  const crop = details.crop as string | null;
  const isHealthy = !disease && !details.unable_to_identify;
  const isUnknown = details.unable_to_identify as boolean;
  const treatment = (details.treatment || insight.recommendation) as string;
  const modelUsed = details.model_used as string | undefined;

  const Icon = isUnknown ? AlertTriangle : isHealthy ? CheckCircle2 : ShieldAlert;
  const iconColor = isUnknown ? '#d4a853' : isHealthy ? '#7cb87a' : '#d4845c';
  const borderColor = isUnknown ? 'border-wheat-500/30' : isHealthy ? 'border-moss-600/30' : 'border-terra-500/30';

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
      }}
      className="space-y-4"
    >
      {/* Summary card */}
      <motion.div variants={cardItemVariants}>
        <GlassCard className={`p-6 border ${borderColor}`}>
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${iconColor}15` }}
            >
              <Icon className="w-6 h-6" style={{ color: iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                {crop && (
                  <span className="agent-badge border text-moss-400">
                    <Leaf className="w-3 h-3" /> {crop}
                  </span>
                )}
                <RiskBadge risk={insight.risk} />
              </div>
              <h3 className="font-display text-xl font-semibold text-gray-100 mt-2">
                {isUnknown
                  ? 'Could not identify disease'
                  : isHealthy
                  ? 'Plant looks healthy'
                  : disease}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{result.summary}</p>
            </div>
            <ConfidenceRing value={Math.round(insight.confidence)} size={64} />
          </div>
        </GlassCard>
      </motion.div>

      {/* Treatment steps */}
      {!isHealthy && (
        <motion.div variants={cardItemVariants}>
          <GlassCard className="p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">
              {isUnknown ? 'What to do' : 'Treatment Steps'}
            </p>
            <div className="space-y-2">
              {treatment.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-moss-400 text-sm mt-0.5 shrink-0">
                    {line.match(/^\d+\./) ? '' : '•'}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed">{line.replace(/^\d+\.\s*/, '')}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {isHealthy && (
        <motion.div variants={cardItemVariants}>
          <GlassCard className="p-5">
            <p className="text-sm text-moss-400 leading-relaxed">{treatment}</p>
          </GlassCard>
        </motion.div>
      )}

      {modelUsed && (
        <motion.p variants={cardItemVariants} className="text-xs text-gray-600 text-right px-1">
          Model: {modelUsed} · {result.total_latency_ms.toFixed(0)}ms
        </motion.p>
      )}
    </motion.div>
  );
}

// ── Scan page ──────────────────────────────────────────────────────────────

const SCAN_STEPS = [
  'Initializing AgriMind vision agent...',
  'Analyzing leaf surface characteristics...',
  'Scanning for chlorosis, necrosis, and lesions...',
  'Running deep vision segmentation models...',
  'Evaluating local climate factor risks...',
  'Coordinating optimal treatment plans...',
];

export function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lat, setLat] = useState(13.0827);
  const [lng, setLng] = useState(80.2707);
  const [location, setLocation] = useState('Tamil Nadu, India');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoordinatorResponse | null>(null);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle tech steps when loading is active
  useEffect(() => {
    if (!loading) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError('');
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.analyzeImage(file, '', lat, lng, location);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setError('Could not get GPS location'),
    );
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="font-display text-3xl font-bold">Crop Disease Scan</h2>
        <p className="text-gray-500 mt-1">
          Upload any crop leaf image — AI detects the disease and gives you exact treatment steps
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload panel */}
        <GlassCard className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !preview && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl text-center transition-all duration-300 group overflow-hidden
              ${preview ? 'border-moss-600/40 cursor-default' : 'border-earth-600 cursor-pointer hover:border-moss-600/40'}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {preview ? (
              <div className={`relative p-4 rounded-xl overflow-hidden ${loading ? 'scanner-container shadow-glow-sm' : ''}`}>
                {loading && (
                  <>
                    <div className="scanner-line" />
                    <div className="scanner-grid" />
                  </>
                )}
                <img
                  src={preview}
                  alt="Crop preview"
                  className={`max-h-72 mx-auto rounded-xl object-contain transition-all duration-500 ${loading ? 'brightness-75 contrast-125 saturate-150 scale-[1.02]' : ''}`}
                />
                {!loading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="absolute top-6 right-6 p-1.5 rounded-full bg-earth-900/80 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="py-12 px-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-moss-600/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-spring">
                  <Upload className="w-8 h-8 text-moss-400" />
                </div>
                <p className="text-gray-300 font-medium">Drop a leaf or crop image here</p>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG, WEBP · Max 10MB</p>
                <p className="text-xs text-gray-600 mt-1">
                  Supports: Tomato, Potato, Corn, Rice, Wheat and more
                </p>
              </div>
            )}
          </div>

          {/* Location row */}
          <div className="flex gap-2">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field flex-1 text-sm"
              placeholder="Your location (optional)"
            />
            <button onClick={getLocation} className="btn-secondary px-4 transition-transform active:scale-95" title="Use GPS">
              <MapPin className="w-4 h-4" />
            </button>
          </div>

          {/* Analyse button */}
          <button
            onClick={analyze}
            disabled={!file || loading}
            className="btn-primary w-full py-4 text-base flex flex-col items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-semibold">Running Diagnostics...</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-moss-glow font-normal opacity-90"
                  >
                    {SCAN_STEPS[stepIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            ) : (
              <span className="flex items-center gap-2"><Camera className="w-5 h-5" /> Detect Disease</span>
            )}
          </button>

          {error && (
            <p className="text-terra-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
        </GlassCard>

        {/* Result panel */}
        <div>
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <DiseaseCard result={result} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel p-12 text-center h-full flex flex-col items-center justify-center gap-4"
              >
                <Camera className="w-14 h-14 text-earth-600 animate-pulse-slow" />
                <div>
                  <p className="text-gray-400 font-medium">Disease detection result</p>
                  <p className="text-xs text-gray-600 mt-2 max-w-xs mx-auto">
                    Upload a clear photo of affected leaves or stems — the AI will identify the disease and tell you exactly how to treat it
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
