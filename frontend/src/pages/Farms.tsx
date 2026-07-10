import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, Plus, MapPin, Ruler, X, Loader2, Leaf, LayoutGrid,
  ChevronRight, Calendar, Droplets, AlertTriangle, CheckCircle2,
  Bell, TrendingUp, Clock, ChevronLeft, Zap, Sun,
} from 'lucide-react';
import {
  api, FarmResponse, FieldResponse, FieldSchedule, CropStage, ScheduleEvent,
} from '../api/client';
import { GlassCard, RiskBadge } from '../components/ui';

// ─────────────────────── crop colours ───────────────────────
const CROP_COLORS: Record<string, string> = {
  tomato: '#d4845c', rice: '#6eb5d9', wheat: '#d4a853',
  potato: '#b89a6e', corn: '#d4c053', cotton: '#9b7ed9',
  default: '#7cb87a',
};
const cropColor = (c: string) => CROP_COLORS[c.toLowerCase()] ?? CROP_COLORS.default;

// ─────────────────────── 3-D field visualiser ───────────────
function Field3D({ acres, crop, stage }: { acres: number; crop: string; stage: string }) {
  const color = cropColor(crop);
  const rows = Math.max(3, Math.min(8, Math.round(Math.sqrt(acres) * 2)));
  const cols = rows + 2;

  return (
    <div
      className="w-full flex items-end justify-center overflow-hidden"
      style={{ height: 160, perspective: 600 }}
    >
      <motion.div
        initial={{ opacity: 0, rotateX: 0 }}
        animate={{ opacity: 1, rotateX: 55 }}
        transition={{ duration: 1, type: 'spring' }}
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          maxWidth: 340,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 3,
          padding: 8,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const delay = (i * 0.012);
          const isEdge = i % cols === 0 || i % cols === cols - 1 || i < cols || i >= (rows - 1) * cols;
          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay, duration: 0.3 }}
              style={{
                height: 18,
                borderRadius: 3,
                background: isEdge
                  ? `${color}30`
                  : `linear-gradient(180deg, ${color}cc 0%, ${color}55 100%)`,
                border: `1px solid ${color}40`,
                boxShadow: isEdge ? 'none' : `0 2px 4px ${color}30`,
              }}
            />
          );
        })}
      </motion.div>
    </div>
  );
}

// ─────────────────────── progress bar ───────────────────────
function ProgressBar({ value, color, label }: { value: number; color: string; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-gray-500">{label}</p>}
      <div className="h-2 rounded-full bg-earth-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ─────────────────────── stage timeline ─────────────────────
function StageTimeline({ stages }: { stages: CropStage[] }) {
  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
          s.is_current ? 'bg-moss-600/10 border border-moss-600/20' :
          s.is_past   ? 'opacity-50' : 'opacity-60'
        }`}>
          <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
            s.is_current ? 'bg-moss-500 ring-2 ring-moss-500/30' :
            s.is_past    ? 'bg-earth-600' : 'bg-earth-700'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-medium ${s.is_current ? 'text-moss-400' : 'text-gray-400'}`}>
                {s.name} {s.is_current && <span className="text-[10px] text-moss-500 ml-1">← now</span>}
              </p>
              <p className="text-[10px] text-gray-600 shrink-0">
                Day {s.start_day}–{s.end_day}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{s.notes}</p>
            {s.is_current && s.progress > 0 && (
              <div className="mt-2">
                <ProgressBar value={s.progress} color="#7cb87a" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────── upcoming events ────────────────────
function EventBadge({ type }: { type: string }) {
  const isPest = type === 'pesticide';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
      isPest ? 'text-terra-400 border-terra-500/30 bg-terra-500/10'
             : 'text-wheat-400 border-wheat-500/30 bg-wheat-500/10'
    }`}>
      {isPest ? '🌿 Pesticide' : '🌾 Fertilizer'}
    </span>
  );
}

function UpcomingEvents({ events }: { events: ScheduleEvent[] }) {
  if (!events.length) return (
    <p className="text-xs text-gray-500 py-4 text-center">No events in the next 30 days</p>
  );
  return (
    <div className="space-y-2">
      {events.map((ev, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-start gap-3 p-3 rounded-xl bg-earth-800/40 border border-earth-700/50"
        >
          <div className="text-center shrink-0">
            <p className="text-lg font-display font-bold text-gray-100">{ev.days_from_now === 0 ? 'Today' : `+${ev.days_from_now}d`}</p>
            <p className="text-[10px] text-gray-600">{new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
          </div>
          <div className="flex-1 min-w-0">
            <EventBadge type={ev.type} />
            <p className="text-sm font-medium text-gray-200 mt-1">{ev.product}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ev.reason}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────── irrigation alert card ──────────────
function IrrigationCard({
  advice, weather,
}: {
  advice: FieldSchedule['irrigation_advice'];
  weather: FieldSchedule['weather'];
}) {
  const shouldWater = advice.should_water;
  const isPast = advice.is_past;
  const isTomorrow = advice.target_day === 'tomorrow';

  // Banner colour
  const bannerClass = !shouldWater
    ? 'border-earth-700/50'
    : isPast
    ? 'border-wheat-500/30'
    : 'border-moss-600/30';

  return (
    <GlassCard className={`p-5 border ${bannerClass}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display font-semibold flex items-center gap-2">
          <Droplets className={`w-4 h-4 ${shouldWater && !isPast ? 'text-moss-400' : isPast ? 'text-wheat-400' : 'text-gray-600'}`} />
          {isTomorrow ? "Tomorrow's Irrigation" : isPast ? 'Window Passed — Plan for Tomorrow' : "Today's Irrigation"}
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sun className="w-3 h-3" /> {weather.temperature_c}°C · {weather.humidity}%
        </div>
      </div>

      {shouldWater ? (
        <>
          {/* Time window */}
          <div className={`rounded-xl p-4 text-center mb-4 ${
            isPast ? 'bg-wheat-500/10 border border-wheat-500/20' : 'bg-moss-600/10 border border-moss-600/20'
          }`}>
            {isPast && (
              <p className="text-xs text-wheat-400 mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Today's window has passed
              </p>
            )}
            <p className="text-xs text-gray-500 mb-1">
              {isTomorrow ? 'Water tomorrow between' : 'Water between'}
            </p>
            <p className={`text-2xl font-display font-bold ${isPast ? 'text-wheat-400' : 'text-moss-400'}`}>
              {advice.window_start} – {advice.window_end}
            </p>
            <p className="text-xs text-gray-500 mt-1">local time</p>
          </div>

          {/* Reason */}
          <p className="text-sm text-gray-300 leading-relaxed mb-4">{advice.reason}</p>

          {/* Daily auto-email note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-earth-800/40 border border-earth-700/50">
            <Bell className="w-4 h-4 text-moss-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-moss-400">Daily email at 6:00 AM</p>
              <p className="text-xs text-gray-500 mt-0.5">
                AgriMind automatically emails you every morning at 6 AM with today's exact watering window and any pesticide reminders.
                Configure SMTP in <code className="bg-earth-800 px-1 rounded">.env</code> to activate.
              </p>
            </div>
          </div>
        </>
      ) : (
        /* Skip day */
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-earth-800/40">
            <CheckCircle2 className="w-5 h-5 text-moss-400 shrink-0" />
            <p className="text-sm text-gray-300">{advice.reason}</p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-earth-800/40 border border-earth-700/50">
            <Bell className="w-4 h-4 text-moss-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-500">
              No email sent today — rain is forecast. Tomorrow's plan will be sent at 6 AM automatically.
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─────────────────────── field detail with schedule ─────────
function FieldDetail({ field, farm, onBack }: { field: FieldResponse; farm: FarmResponse; onBack: () => void }) {
  const color = cropColor(field.crop);

  const { data: schedule, isLoading } = useQuery<FieldSchedule>({
    queryKey: ['schedule', field.id],
    queryFn: () => api.fields.schedule(field.id),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-secondary px-3 py-2 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-2xl font-bold">{field.name}</h3>
            <span className="agent-badge border" style={{ borderColor: `${color}40`, color }}>{field.crop}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {farm.name} · {farm.location}
          </p>
        </div>
      </div>

      {/* 3D visualiser + harvest countdown */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Field View · {farm.area_acres ?? '?'} acres</p>
            {schedule && (
              <span className="text-xs text-moss-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> {schedule.current_stage}
              </span>
            )}
          </div>
          <Field3D acres={farm.area_acres ?? 1} crop={field.crop} stage={schedule?.current_stage ?? ''} />
        </GlassCard>

        <div className="space-y-3">
          {/* Harvest countdown */}
          {schedule && (
            <GlassCard className="p-5 text-center" glow="wheat">
              <Calendar className="w-5 h-5 text-wheat-400 mx-auto mb-2" />
              <p className="text-4xl font-display font-bold text-wheat-400">{schedule.days_to_harvest}</p>
              <p className="text-xs text-gray-500 mt-1">days to harvest</p>
              <p className="text-xs text-gray-600 mt-2">
                {new Date(schedule.harvest_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-3">
                <ProgressBar value={schedule.overall_progress} color={color} label={`${schedule.overall_progress}% complete`} />
              </div>
            </GlassCard>
          )}

          {/* Water need today */}
          {schedule && (
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-moss-400" />
                <p className="text-xs text-gray-400 uppercase tracking-wider">Water Need</p>
              </div>
              <p className="text-lg font-semibold capitalize" style={{ color }}>
                {schedule.water_need}
              </p>
              <p className="text-xs text-gray-500 mt-1">{schedule.stage_notes}</p>
            </GlassCard>
          )}
        </div>
      </div>

      {isLoading && (
        <GlassCard className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-moss-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Fetching live weather & building schedule...</p>
        </GlassCard>
      )}

      {schedule && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left — irrigation + events */}
          <div className="space-y-4">
            <IrrigationCard
              advice={schedule.irrigation_advice}
              weather={schedule.weather}
            />

            <GlassCard className="p-5">
              <h4 className="font-display font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-wheat-400" /> Upcoming (30 days)
              </h4>
              <UpcomingEvents events={schedule.upcoming_events} />
            </GlassCard>
          </div>

          {/* Right — stage timeline */}
          <GlassCard className="p-5">
            <h4 className="font-display font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-moss-400" /> Growth Stages
            </h4>
            <StageTimeline stages={schedule.stages} />
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// ─────────────────────── farm detail with fields ────────────
function FarmDetail({ farm, onBack }: { farm: FarmResponse; onBack: () => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldResponse | null>(null);
  const [form, setForm] = useState({ name: '', crop: 'Tomato', crop_age_days: '' });
  const [err, setErr] = useState('');

  const CROPS = ['Tomato', 'Rice', 'Wheat', 'Potato', 'Corn', 'Cotton'];

  const { data: fields = [], isLoading } = useQuery<FieldResponse[]>({
    queryKey: ['fields', farm.id],
    queryFn: () => api.fields.listByFarm(farm.id),
  });

  const create = useMutation({
    mutationFn: api.fields.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fields', farm.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowForm(false);
      setForm({ name: '', crop: 'Tomato', crop_age_days: '' });
      setErr('');
    },
    onError: (e: Error) => setErr(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Field name is required'); return; }
    create.mutate({
      name: form.name.trim(), crop: form.crop,
      crop_age_days: form.crop_age_days ? parseInt(form.crop_age_days) : undefined,
      farm_id: farm.id,
    });
  };

  if (selectedField) {
    return <FieldDetail field={selectedField} farm={farm} onBack={() => setSelectedField(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-secondary px-3 py-2 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Farms
        </button>
        <div>
          <h2 className="font-display text-3xl font-bold">{farm.name}</h2>
          <p className="text-gray-500 mt-1 flex items-center gap-1.5 text-sm">
            <MapPin className="w-3 h-3" />{farm.location}
            {farm.area_acres && <span className="ml-2">· {farm.area_acres} acres</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-moss-400" /> Fields ({fields.length})
        </h3>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Field
        </button>
      </div>

      {/* Add field modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-8 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-semibold">New Field</h3>
                <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Field Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field" placeholder="e.g. Plot A" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Crop *</label>
                  <div className="flex flex-wrap gap-2">
                    {CROPS.map((c) => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, crop: c })}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                          form.crop === c
                            ? 'bg-moss-600/20 text-moss-400 border border-moss-600/30'
                            : 'bg-earth-800/50 text-gray-400 border border-earth-600'
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                    How many days since planting?
                  </label>
                  <input value={form.crop_age_days} onChange={(e) => setForm({ ...form, crop_age_days: e.target.value })}
                    className="input-field" placeholder="e.g. 30 (0 = just planted)"
                    type="number" min="0" max="365" />
                </div>
                {err && <p className="text-terra-400 text-sm">{err}</p>}
                <button type="submit" disabled={create.isPending}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                  {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Field</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fields grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="glass-panel h-40 animate-pulse" />)}
        </div>
      ) : fields.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Leaf className="w-10 h-10 text-earth-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No fields yet</p>
          <p className="text-xs text-gray-600 mt-2 mb-5">Add your first crop field to get AI schedule & irrigation alerts</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add First Field
          </button>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field, i) => {
            const color = cropColor(field.crop);
            return (
              <motion.div key={field.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <GlassCard className="overflow-hidden cursor-pointer group h-full" delay={i * 0.06}>
                  {/* Mini 3D field */}
                  <div className="bg-earth-900/50 overflow-hidden" style={{ height: 90 }}>
                    <Field3D acres={1} crop={field.crop} stage="" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-display font-semibold text-gray-100">{field.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full border mt-1 inline-block"
                          style={{ borderColor: `${color}40`, color, background: `${color}10` }}>{field.crop}</span>
                      </div>
                      <button onClick={() => setSelectedField(field)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-moss-400 transition-colors mt-1">
                        Manage <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {field.crop_age_days != null ? `${field.crop_age_days} days old` : 'Age unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(field.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────── main farms page ────────────────────
export function FarmsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', latitude: '', longitude: '', area_acres: '' });
  const [formError, setFormError] = useState('');
  const [selectedFarm, setSelectedFarm] = useState<FarmResponse | null>(null);

  const { data: farms = [], isLoading } = useQuery<FarmResponse[]>({
    queryKey: ['farms'],
    queryFn: api.farms.list,
  });

  const createFarm = useMutation({
    mutationFn: api.farms.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farms'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowForm(false);
      setForm({ name: '', location: '', latitude: '', longitude: '', area_acres: '' });
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) { setFormError('Name and location are required'); return; }
    createFarm.mutate({
      name: form.name.trim(), location: form.location.trim(),
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      area_acres: form.area_acres ? parseFloat(form.area_acres) : undefined,
    });
  };

  const getGPS = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setForm((f) => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(4),
        longitude: pos.coords.longitude.toFixed(4),
      }));
    });
  };

  if (selectedFarm) {
    return <FarmDetail farm={selectedFarm} onBack={() => setSelectedFarm(null)} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold">My Farms</h2>
          <p className="text-gray-500 mt-1">Manage farms · view 3D fields · get AI crop schedules</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Farm
        </button>
      </div>

      {/* Create Farm Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-8 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-semibold">New Farm</h3>
                <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Farm Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field" placeholder="e.g. Green Valley Farm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Location *</label>
                  <div className="flex gap-2">
                    <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="input-field flex-1" placeholder="e.g. Tamil Nadu, India" />
                    <button type="button" onClick={getGPS} className="btn-secondary px-4" title="Use GPS">
                      <MapPin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Latitude</label>
                    <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      className="input-field" placeholder="13.08" type="number" step="any" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Longitude</label>
                    <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      className="input-field" placeholder="80.27" type="number" step="any" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Acres</label>
                    <input value={form.area_acres} onChange={(e) => setForm({ ...form, area_acres: e.target.value })}
                      className="input-field" placeholder="5.5" type="number" step="0.1" min="0" />
                  </div>
                </div>
                {formError && <p className="text-terra-400 text-sm">{formError}</p>}
                <button type="submit" disabled={createFarm.isPending}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                  {createFarm.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                    : <><Plus className="w-4 h-4" /> Create Farm</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Farm list */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="glass-panel h-56 animate-pulse" />)}
        </div>
      ) : farms.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <Sprout className="w-12 h-12 text-earth-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No farms yet</p>
          <p className="text-xs text-gray-600 mt-2 mb-6">
            Add your first farm — then add fields to get AI-powered crop schedules, irrigation alerts, and email reminders
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Your First Farm
          </button>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm, i) => (
            <motion.div key={farm.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <GlassCard delay={i * 0.06} className="overflow-hidden group cursor-pointer h-full">
                {/* Farm 3D preview (use 1 acre as default for preview) */}
                <div className="bg-earth-900/60 h-28 overflow-hidden">
                  <Field3D acres={farm.area_acres ?? 2} crop="tomato" stage="" />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-moss-600/10 flex items-center justify-center">
                      <Sprout className="w-5 h-5 text-moss-400" />
                    </div>
                    <button onClick={() => setSelectedFarm(farm)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-moss-400 transition-colors">
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <h3 className="font-display font-semibold text-lg text-gray-100">{farm.name}</h3>
                  <div className="mt-2 space-y-1.5">
                    <p className="flex items-center gap-1.5 text-sm text-gray-400">
                      <MapPin className="w-3 h-3 text-gray-600" />{farm.location}
                    </p>
                    {farm.area_acres && (
                      <p className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Ruler className="w-3 h-3 text-gray-600" />{farm.area_acres} acres
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-earth-700/50 flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      {new Date(farm.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <span className="text-xs text-moss-500 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> AI Schedule
                    </span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
