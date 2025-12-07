import type { 
  Experiment, 
  ExperimentsListResponse, 
  ExperimentResults 
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://ec2-3-136-108-183.us-east-2.compute.amazonaws.com:8000';

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function fetchWithAuth<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

export async function getExperiments(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ExperimentsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  
  const query = searchParams.toString();
  return fetchWithAuth<ExperimentsListResponse>(
    `/experiments${query ? `?${query}` : ''}`
  );
}

export async function getExperiment(id: number): Promise<Experiment> {
  return fetchWithAuth<Experiment>(`/experiments/${id}`);
}

export async function getExperimentResults(
  id: number,
  params?: {
    start_date?: string;
    end_date?: string;
    event_types?: string;
    format?: 'full' | 'summary' | 'metrics_only';
    include_time_series?: boolean;
    time_series_granularity?: 'hour' | 'day' | 'week';
  }
): Promise<ExperimentResults> {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.event_types) searchParams.set('event_types', params.event_types);
  if (params?.format) searchParams.set('format', params.format);
  if (params?.include_time_series) searchParams.set('include_time_series', 'true');
  if (params?.time_series_granularity) {
    searchParams.set('time_series_granularity', params.time_series_granularity);
  }
  
  const query = searchParams.toString();
  return fetchWithAuth<ExperimentResults>(
    `/experiments/${id}/results${query ? `?${query}` : ''}`
  );
}

export async function getEventTypes(): Promise<{ event_types: Array<{ type: string; count: number }> }> {
  return fetchWithAuth<{ event_types: Array<{ type: string; count: number }> }>('/events/types');
}

