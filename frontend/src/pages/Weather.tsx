import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Cloud, Droplets, Thermometer, Wind, MapPin, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { api, FieldResponse, FarmResponse, FieldSchedule, WeatherData } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { GlassCard, RiskBadge, ConfidenceRing } from '../components/ui';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

export function WeatherPage() {
  const { user } = useAuth();
  const [lat, setLat] = useState(13.0827);
  const [lng, setLng] = useState(80.2707);
  const [crop, setCrop] = useState('tomato');
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);

  const { data: farms } = useQuery<FarmResponse[]>({
    queryKey: ['farms'],
    queryFn: api.farms.list,
    enabled: !!user,
  });

  const { data: fields } = useQuery<FieldResponse[]>({
    queryKey: ['fields', selectedFarmId],
    queryFn: () => (selectedFarmId ? api.fields.listByFarm(selectedFarmId) : Promise.resolve([])),
    enabled: !!selectedFarmId,
    placeholderData: (prev) => prev,
  });

  const selectedFarm = farms?.find((farm) => farm.id === selectedFarmId) ?? null;
  const selectedField = fields?.find((field) => field.id === selectedFieldId) ?? null;

  useEffect(() => {
    if (selectedFarm?.latitude != null && selectedFarm?.longitude != null) {
      setLat(selectedFarm.latitude);
      setLng(selectedFarm.longitude);
    }
  }, [selectedFarm?.latitude, selectedFarm?.longitude]);

  useEffect(() => {
    if (selectedField?.crop) {
      setCrop(selectedField.crop.toLowerCase());
    }
  }, [selectedField?.crop]);

  useEffect(() => {
    setSelectedFieldId(null);
  }, [selectedFarmId]);

  const fieldScheduleQuery = useQuery<FieldSchedule | null>({
    queryKey: ['field-schedule', selectedFieldId],
    queryFn: () => (selectedFieldId ? api.fields.schedule(selectedFieldId) : Promise.resolve(null)),
    enabled: !!selectedFieldId,
    staleTime: 5 * 60 * 1000,
  });

  const weatherQuery = useQuery<WeatherData>({
    queryKey: ['weather', lat, lng, crop],
    queryFn: () => api.weather(lat, lng, crop),
    enabled: !selectedFieldId,
  });

  const schedule = fieldScheduleQuery.data;
  const weatherInfo = schedule ? { ...schedule.weather, recommendation: schedule.irrigation_advice.reason, temperature_c: schedule.weather.temperature_c, humidity: schedule.weather.humidity, rainfall_mm: schedule.weather.rainfall_mm, forecast_rain_probability: schedule.weather.rain_probability, confidence: 88.0, location: selectedFarm?.location ?? 'Field Location', risk: schedule.irrigation_advice.should_water ? 'Medium' : 'Low' } : weatherQuery.data;
  const isLoading = fieldScheduleQuery.isLoading || weatherQuery.isLoading;
  const refetch = () => {
    if (selectedFieldId) {
      fieldScheduleQuery.refetch();
    } else {
      weatherQuery.refetch();
    }
  };

  const getGPS = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    });
  };

  const weatherData = weatherInfo;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold">Weather Intelligence</h2>
          <p className="text-gray-500 mt-1">Real-time forecast with irrigation recommendations</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="h-64 rounded-xl overflow-hidden mb-4">
            <MapContainer center={[lat, lng]} zoom={8} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[lat, lng]} icon={markerIcon} />
            </MapContainer>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <button onClick={getGPS} className="btn-secondary flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" /> Use My Location
            </button>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase tracking-wider">Crop</label>
              <select value={crop} onChange={(e) => setCrop(e.target.value)} className="input-field w-full">
                {['tomato', 'rice', 'wheat', 'potato'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {user && farms?.length ? (
              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider">Choose Field</label>
                <div className="space-y-2">
                  <select
                    value={selectedFarmId ?? ''}
                    onChange={(e) => setSelectedFarmId(e.target.value ? Number(e.target.value) : null)}
                    className="input-field w-full"
                  >
                    <option value="">Select farm</option>
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>{farm.name} · {farm.location}</option>
                    ))}
                  </select>
                  <select
                    value={selectedFieldId ?? ''}
                    onChange={(e) => setSelectedFieldId(e.target.value ? Number(e.target.value) : null)}
                    className="input-field w-full"
                    disabled={!fields?.length}
                  >
                    <option value="">Select field</option>
                    {fields?.map((field) => (
                      <option key={field.id} value={field.id}>{field.name} · {field.crop}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        </GlassCard>

        {isLoading ? (
          <GlassCard className="p-6 flex items-center justify-center"><p className="text-gray-500">Loading weather...</p></GlassCard>
        ) : weatherData ? (
          <div className="space-y-4">
            <GlassCard glow="moss" className="p-6 text-center">
              <ConfidenceRing value={Math.round(weatherData.confidence)} size={80} />
              <p className="text-4xl font-display font-bold mt-4">{weatherData.temperature_c}°C</p>
              <p className="text-gray-500 text-sm">{weatherData.location}</p>
              <div className="mt-3"><RiskBadge risk={weatherData.risk} /></div>
            </GlassCard>

            {[
              { icon: Droplets, label: 'Humidity', value: `${weatherData.humidity}%`, color: '#6eb5d9', animate: { y: [0, 2, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
              { icon: Cloud, label: 'Rain Chance', value: `${weatherData.forecast_rain_probability}%`, color: '#5b9bd5', animate: { x: [0, 1.5, 0], y: [0, -1.5, 0] }, transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } },
              { icon: Wind, label: 'Rainfall', value: `${weatherData.rainfall_mm} mm`, color: '#7cb87a', animate: { rotate: [0, 8, 0] }, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
              { icon: Thermometer, label: 'Irrigation', value: 'See below', color: '#d4a853', animate: { scale: [1, 1.06, 1] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
            ].map((item, i) => (
              <motion.div 
                key={item.label} 
                initial={{ opacity: 0, x: 20, scale: 0.98 }} 
                animate={{ opacity: 1, x: 0, scale: 1 }} 
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 100 }}
              >
                <GlassCard className="p-4 flex items-center gap-4 hover:border-moss-500/25 hover:-translate-y-0.5 hover:shadow-glow-sm transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: `${item.color}15`, border: `1px solid ${item.color}10` }}>
                    <motion.div animate={item.animate} transition={item.transition}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}

            <GlassCard className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Recommendation</p>
              <p className="text-sm text-moss-400 leading-relaxed">{weatherData.recommendation}</p>
            </GlassCard>
          </div>
        ) : null}
      </div>

      {selectedFieldId && schedule ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <GlassCard className="p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Field Plan</p>
            <h3 className="font-display text-2xl font-semibold mb-3">{selectedField?.name}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {selectedFarm?.name} · {selectedFarm?.location}
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-earth-700/60 p-4 bg-earth-900/80">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Irrigation Advice</p>
                <p className="text-lg font-semibold mt-2">{schedule.irrigation_advice.should_water ? 'Water' : 'Skip irrigation'}</p>
                <p className="text-sm text-gray-400 mt-1">{schedule.irrigation_advice.reason}</p>
                {schedule.irrigation_advice.should_water ? (
                  <p className="text-sm text-moss-300 mt-2">
                    Water between {schedule.irrigation_advice.window_start} and {schedule.irrigation_advice.window_end} local time.
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-earth-700/60 p-4 bg-earth-900/80">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Weather snapshot</p>
                <p className="text-sm text-gray-300 mt-2">
                  {weatherData?.temperature_c}°C · {weatherData?.humidity}% humidity · {weatherData?.forecast_rain_probability}% rain chance.
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tomorrow's Plan</p>
            <p className="text-sm text-gray-400 mb-4">
              {schedule.irrigation_advice.target_day === 'tomorrow'
                ? 'This field has a tomorrow-focused irrigation plan based on current weather and crop stage.'
                : 'The plan is based on the latest weather data and crop schedule.'}
            </p>
            <div className="space-y-4">
              {schedule.upcoming_events.map((event, idx) => (
                <div key={idx} className="rounded-xl border border-earth-700/60 p-4 bg-earth-900/80">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{event.type === 'pesticide' ? 'Pesticide' : 'Fertilizer'} event</p>
                  <p className="text-sm text-gray-300 font-semibold mt-2">{event.product}</p>
                  <p className="text-xs text-gray-400 mt-1">{event.reason}</p>
                  <p className="text-xs text-gray-500 mt-2">{event.days_from_now === 0 ? 'Today' : `In ${event.days_from_now} days`} · {new Date(event.date).toLocaleDateString('en-IN')}</p>
                </div>
              ))}
              {!schedule.upcoming_events.length ? (
                <p className="text-sm text-gray-400">No scheduled pesticide or fertilizer events for the next 30 days.</p>
              ) : null}
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
