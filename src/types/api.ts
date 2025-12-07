// Experiment & Variant Types
export interface Variant {
  id: number;
  experiment_id: number;
  name: string;
  traffic_allocation: number;
  config?: Record<string, unknown>;
}

export interface Experiment {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  created_at: string;
  started_at?: string;
  ended_at?: string;
  variants: Variant[];
}

export interface ExperimentsListResponse {
  experiments: Experiment[];
  total: number;
  limit: number;
  offset: number;
}

export interface Assignment {
  id: number;
  experiment_id: number;
  variant_id: number;
  user_id: string;
  assigned_at: string;
}

export interface Event {
  id: number;
  user_id: string;
  event_type: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export interface VariantMetrics {
  variant_id: number;
  variant_name: string;
  total_assignments: number;
  total_events: number;
  unique_users_with_events: number;
  conversion_rate: number;  
  events_by_type: Record<string, number>;
  events_per_user: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  variant_id: number;
  variant_name: string;
  assignments: number;
  events: number;
  conversion_rate: number;
}

export interface ResultsSummary {
  total_assignments: number;
  total_events: number;
  overall_conversion_rate: number;  
  leading_variant: string | null;
  confidence_level: 'low' | 'medium' | 'high' | 'significant';
}

export interface ExperimentResults {
  experiment_id: number;
  experiment_name: string;
  experiment_status: 'draft' | 'running' | 'paused' | 'completed';
  analysis_start: string;
  analysis_end: string;
  summary: ResultsSummary;
  variant_metrics: VariantMetrics[];
  time_series: TimeSeriesDataPoint[];
  events_by_type: Record<string, number>;
  generated_at: string;
}

export interface ApiError {
  detail: string;
  status_code: number;
}
