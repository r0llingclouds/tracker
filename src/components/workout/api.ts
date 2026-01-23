import type { 
  KettlebellEntry, 
  PushUpEntry, 
  KettlebellFormData, 
  PushUpFormData, 
  WorkoutSummary,
  DailyWorkoutData
} from '../../types/workout';

const API_BASE = '/api';

// Helper for API calls
async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

// ============ KETTLEBELL API ============

export async function getKettlebellEntries(date?: string): Promise<KettlebellEntry[]> {
  const params = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchAPI<KettlebellEntry[]>(`/workouts/kettlebell${params}`);
}

export async function createKettlebellEntry(data: KettlebellFormData & { date?: string }): Promise<KettlebellEntry> {
  return fetchAPI<KettlebellEntry>('/workouts/kettlebell', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKettlebellEntry(id: number, data: Partial<KettlebellFormData>): Promise<KettlebellEntry> {
  return fetchAPI<KettlebellEntry>(`/workouts/kettlebell/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKettlebellEntry(id: number): Promise<void> {
  return fetchAPI<void>(`/workouts/kettlebell/${id}`, {
    method: 'DELETE',
  });
}

// ============ PUSH UPS API ============

export async function getPushUpEntries(date?: string): Promise<PushUpEntry[]> {
  const params = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchAPI<PushUpEntry[]>(`/workouts/pushups${params}`);
}

export async function createPushUpEntry(data: PushUpFormData & { date?: string }): Promise<PushUpEntry> {
  return fetchAPI<PushUpEntry>('/workouts/pushups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePushUpEntry(id: number, data: Partial<PushUpFormData>): Promise<PushUpEntry> {
  return fetchAPI<PushUpEntry>(`/workouts/pushups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePushUpEntry(id: number): Promise<void> {
  return fetchAPI<void>(`/workouts/pushups/${id}`, {
    method: 'DELETE',
  });
}

// ============ DAILY TIMER DATA API ============

export async function getDailyWorkoutData(date?: string): Promise<DailyWorkoutData> {
  const params = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchAPI<DailyWorkoutData>(`/workouts/daily${params}`);
}

export async function updateDailyWorkoutData(data: { 
  kettlebell_time?: number; 
  pushup_time?: number 
}): Promise<DailyWorkoutData> {
  return fetchAPI<DailyWorkoutData>('/workouts/daily', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============ SUMMARY API ============

export async function getWorkoutSummary(date?: string): Promise<WorkoutSummary> {
  const params = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchAPI<WorkoutSummary>(`/workouts/summary${params}`);
}
