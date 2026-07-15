const API_BASE = '';

export interface User {
  id: number;
  email: string;
  full_name: string;
  location: string | null;
  language: string;
  is_admin?: boolean;
  created_at: string;
}

export interface AdminStatsResponse {
  total_farmers: int;
  total_farms: int;
  total_fields: int;
  total_scans: int;
  total_listings: int;
}

export interface AdminFarmerResponse {
  id: number;
  email: string;
  full_name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  farms_count: number;
  fields_count: number;
}

export interface AdminFarmerDetailResponse extends AdminFarmerResponse {
  recent_scans: number;
}

export interface AdminActivityResponse {
  id: number;
  user_id: number;
  user_email: string;
  agent: string;
  input_summary: string;
  created_at: string;
}

export interface AdminListingResponse {
  id: number;
  crop: string;
  price_per_kg: number;
  quantity_kg: number;
  seller_name: string;
  seller_email: string;
  created_at: string;
}

export interface AdminOrderResponse {
  id: number;
  crop: string;
  price_per_kg: number;
  quantity_kg: number;
  buyer_name: string;
  buyer_email: string;
  seller_name: string;
  seller_email: string;
  created_at: string;
}

export interface AdminAgentLogResponse {
  id: number;
  coordinator_session: string;
  agent_name: string;
  action: string;
  latency_ms: number;
  created_at: string;
}

export interface AgentInsight {
  agent: string;
  problem?: string;
  cause?: string;
  recommendation: string;
  confidence: number;
  risk: string;
  details: Record<string, unknown>;
}

export interface CoordinatorResponse {
  session_id: string;
  summary: string;
  insights: AgentInsight[];
  total_latency_ms: number;
}

export interface DashboardStats {
  total_predictions: number;
  farms_count: number;
  fields_count: number;
  recent_alerts: string[];
  health_score: number;
}

export interface PredictionHistory {
  id: number;
  agent: string;
  input_summary: string;
  result_json: string;
  confidence: number | null;
  created_at: string;
}

export interface WeatherData {
  location: string;
  temperature_c: number;
  humidity: number;
  rainfall_mm: number;
  forecast_rain_probability: number;
  irrigation_suggestion: string;
  confidence: number;
  recommendation: string;
  risk: string;
}

export interface MarketData {
  crop: string;
  predicted_price_per_kg: number;
  best_market: string;
  best_selling_date: string;
  trend: string;
  confidence: number;
  recommendation: string;
  risk: string;
}

export interface FarmResponse {
  id: number;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  area_acres: number | null;
  created_at: string;
}

export interface ListingResponse {
  id: number;
  seller_id: number;
  crop: string;
  price_per_kg: number;
  quantity_kg: number;
  image_path?: string | null;
  created_at: string;
  seller_name?: string | null;
  seller_email?: string | null;
}

export interface OrderResponse {
  id: number;
  listing_id: number;
  crop: string;
  price_per_kg: number;
  listing_quantity_kg: number;
  quantity_kg: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_address: string;
  created_at: string;
}

export interface FieldResponse {
  id: number;
  name: string;
  crop: string;
  crop_age_days: number | null;
  farm_id: number;
  created_at: string;
}

export interface CropStage {
  name: string;
  start_day: number;
  end_day: number;
  water_need: string;
  notes: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_past: boolean;
  progress: number;
}

export interface ScheduleEvent {
  type: 'pesticide' | 'fertilizer';
  day: number;
  days_from_now: number;
  date: string;
  product: string;
  reason: string;
}

export interface IrrigationAdvice {
  should_water: boolean;
  window_start: string | null;
  window_end: string | null;
  is_past: boolean;
  target_day: 'today' | 'tomorrow';
  reason: string;
  email_message: string;
}

export interface FieldSchedule {
  crop: string;
  crop_age_days: number;
  total_days: number;
  remaining_days: number;
  overall_progress: number;
  planting_date: string;
  harvest_date: string;
  days_to_harvest: number;
  current_stage: string;
  stage_progress: number;
  stage_notes: string;
  water_need: string;
  irrigation_advice: IrrigationAdvice;
  stages: CropStage[];
  upcoming_events: ScheduleEvent[];
  weather: {
    temperature_c: number;
    humidity: number;
    rainfall_mm: number;
    rain_probability: number;
  };
}

export interface NDVIDataPoint {
  date: string;
  ndvi_actual: number | null;
  ndmi_actual: number | null;
  msavi_actual: number | null;
  ndvi_pred: number;
  ndmi_pred: number;
  msavi_pred: number;
  temp_max: number | null;
  humidity: number | null;
  precipitation: number | null;
}

export interface NDVIForecastPoint {
  date: string;
  ndvi_pred: number;
  ndmi_pred: number;
  msavi_pred: number;
  ndvi_health: string;
  ndmi_status: string;
}

export interface NDVIAnalysis {
  historical: NDVIDataPoint[];
  forecast: NDVIForecastPoint[];
  current_health: string;
  health_score: number;
  current_ndvi: number;
  current_ndmi: number;
  current_msavi: number;
  ndvi_trend: string;
  ndmi_trend: string;
  summary: string;
  suggestions: string[];
  trend_30d: string;
  model_r2_ndvi: number;
  model_r2_ndmi: number;
  model_r2_msavi: number;
  training_samples: number;
  latency_ms: number;
  error?: string;
}

function getToken(): string | null {
  return localStorage.getItem('agrimind_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  register: (data: { email: string; full_name: string; password: string; location?: string }) =>
    request<{ access_token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>('/api/auth/me'),

  dashboard: () => request<DashboardStats>('/api/dashboard'),

  history: () => request<PredictionHistory[]>('/api/history'),

  analyzeImage: (file: File, crop: string, lat: number, lng: number, location: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('crop', crop);
    form.append('latitude', String(lat));
    form.append('longitude', String(lng));
    form.append('location', location);
    return request<CoordinatorResponse>('/api/image', { method: 'POST', body: form });
  },

  predict: (data: Record<string, unknown>) =>
    request<CoordinatorResponse>('/api/predict', { method: 'POST', body: JSON.stringify(data) }),

  weather: (lat: number, lng: number, crop: string) =>
    request<WeatherData>(`/api/weather?latitude=${lat}&longitude=${lng}&crop=${crop}`),

  market: (crop: string) => request<MarketData>(`/api/market?crop=${crop}`),
  // Marketplace endpoints
  createListing: (form: FormData) => request('/api/market/listings', { method: 'POST', body: form }),
  listListings: (crop?: string) => request<ListingResponse[]>(`/api/market/listings${crop ? `?crop=${crop}` : ''}`),
  purchase: (data: { listing_id: number; buyer_name: string; buyer_phone: string; buyer_address: string; quantity_kg: number }) =>
    request<OrderResponse>('/api/market/purchase', { method: 'POST', body: JSON.stringify(data) }),
  listSellerOrders: () => request<OrderResponse[]>('/api/market/orders'),

  rag: (question: string) =>
    request<{ answer: string; sources: string[]; confidence: number }>('/api/rag', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  soil: (data: { nitrogen: number; phosphorus: number; potassium: number; ph: number; crop: string }) =>
    request<Record<string, unknown>>('/api/soil', { method: 'POST', body: JSON.stringify(data) }),

  ndvi: {
    analyze: (file: File): Promise<NDVIAnalysis> => {
      const form = new FormData();
      form.append('file', file);
      return request<NDVIAnalysis>('/api/ndvi/analyze', { method: 'POST', body: form });
    },
  },

  farms: {
    list: () => request<FarmResponse[]>('/api/farms'),
    create: (data: {
      name: string;
      location: string;
      latitude?: number;
      longitude?: number;
      area_acres?: number;
    }) => request<FarmResponse>('/api/farms', { method: 'POST', body: JSON.stringify(data) }),
  },

  fields: {
    listByFarm: (farmId: number) => request<FieldResponse[]>(`/api/fields?farm_id=${farmId}`),
    create: (data: {
      name: string;
      crop: string;
      crop_age_days?: number;
      farm_id: number;
    }) => request<FieldResponse>('/api/fields', { method: 'POST', body: JSON.stringify(data) }),
    /** Pass the user's current local hour (0-23) so the server gives time-aware advice */
    schedule: (fieldId: number) => {
      const hour = new Date().getHours();
      return request<FieldSchedule>(`/api/fields/${fieldId}/schedule?current_hour=${hour}`);
    },
    notify: (fieldId: number) =>
      request<{ sent: boolean; should_water: boolean; window: string | null; reason: string }>
        (`/api/fields/${fieldId}/notify`, { method: 'POST' }),
  },

  knowledge: {
    /** Streaming SSE chat — calls onEvent for each parsed event */
    chat: async (
      question: string,
      onEvent: (event: Record<string, unknown>) => void,
    ): Promise<void> => {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Chat failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              onEvent(JSON.parse(line.slice(6)));
            } catch { /* ignore malformed */ }
          }
        }
      }
    },

    listDocs: () => request<Array<{ id: string; name: string; chunks: number; created_at: string }>>('/api/knowledge/documents'),

    uploadDoc: (file: File): Promise<{ doc_id: string; name: string; status: string }> => {
      const form = new FormData();
      form.append('file', file);
      return request('/api/knowledge/documents', { method: 'POST', body: form });
    },

    deleteDoc: (docId: string) =>
      request<{ message: string }>(`/api/knowledge/documents/${docId}`, { method: 'DELETE' }),
  },

  admin: {
    login: (data: { email: string; password: string }) =>
      request<{ access_token: string; user: User }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    stats: () => request<AdminStatsResponse>('/api/admin/stats'),
    farmers: () => request<AdminFarmerResponse[]>('/api/admin/farmers'),
    farmerDetail: (id: number) => request<AdminFarmerDetailResponse>(`/api/admin/farmers/${id}`),
    toggleFarmer: (id: number) => request<{ message: string; is_active: boolean }>(`/api/admin/farmers/${id}/toggle`, { method: 'PUT' }),
    activity: () => request<AdminActivityResponse[]>('/api/admin/activity'),
    listings: () => request<AdminListingResponse[]>('/api/admin/listings'),
    orders: () => request<AdminOrderResponse[]>('/api/admin/orders'),
    logs: () => request<AdminAgentLogResponse[]>('/api/admin/logs'),
  },
};
