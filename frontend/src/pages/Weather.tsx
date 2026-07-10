import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Cloud, Droplets, Thermometer, Wind, MapPin, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { api, WeatherData } from '../api/client';
import { GlassCard, RiskBadge, ConfidenceRing } from '../components/ui';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

export function WeatherPage() {
  const [lat, setLat] = useState(13.0827);
  const [lng, setLng] = useState(80.2707);
  const [crop, setCrop] = useState('tomato');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['weather', lat, lng, crop],
    queryFn: () => api.weather(lat, lng, crop),
  });

  const getGPS = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    });
  };

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
          <div className="flex gap-2">
            <button onClick={getGPS} className="btn-secondary flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" /> Use My Location
            </button>
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="input-field w-auto">
              {['tomato', 'rice', 'wheat', 'potato'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </GlassCard>

        {isLoading ? (
          <GlassCard className="p-6 flex items-center justify-center"><p className="text-gray-500">Loading weather...</p></GlassCard>
        ) : data ? (
          <div className="space-y-4">
            <GlassCard glow="moss" className="p-6 text-center">
              <ConfidenceRing value={Math.round(data.confidence)} size={80} />
              <p className="text-4xl font-display font-bold mt-4">{data.temperature_c}°C</p>
              <p className="text-gray-500 text-sm">{data.location}</p>
              <div className="mt-3"><RiskBadge risk={data.risk} /></div>
            </GlassCard>

            {[
              { icon: Droplets, label: 'Humidity', value: `${data.humidity}%`, color: '#6eb5d9' },
              { icon: Cloud, label: 'Rain Chance', value: `${data.forecast_rain_probability}%`, color: '#5b9bd5' },
              { icon: Wind, label: 'Rainfall', value: `${data.rainfall_mm} mm`, color: '#7cb87a' },
              { icon: Thermometer, label: 'Irrigation', value: 'See below', color: '#d4a853' },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
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
              <p className="text-sm text-moss-400 leading-relaxed">{data.recommendation}</p>
            </GlassCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
