import type { Food, FoodLog, DailyData, DailySummary, FoodFormData, ParsedFood, MealLookupResponse } from '../../types/food';

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

// ============ FOODS API ============

export async function getFoods(search?: string): Promise<Food[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchAPI<Food[]>(`/foods${params}`);
}

export async function getFood(id: number): Promise<Food> {
  return fetchAPI<Food>(`/foods/${id}`);
}

export async function createFood(food: FoodFormData): Promise<Food> {
  return fetchAPI<Food>('/foods', {
    method: 'POST',
    body: JSON.stringify(food),
  });
}

export async function updateFood(id: number, food: Partial<FoodFormData>): Promise<Food> {
  return fetchAPI<Food>(`/foods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(food),
  });
}

export async function deleteFood(id: number): Promise<void> {
  return fetchAPI<void>(`/foods/${id}`, {
    method: 'DELETE',
  });
}

export async function parseFood(text: string): Promise<{ parsed: ParsedFood }> {
  return fetchAPI<{ parsed: ParsedFood }>('/foods/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function lookupMeal(description: string): Promise<MealLookupResponse> {
  return fetchAPI<MealLookupResponse>('/foods/meal-lookup', {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}

// ============ LOGS API ============

export async function getLogs(date?: string): Promise<FoodLog[]> {
  const params = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchAPI<FoodLog[]>(`/logs${params}`);
}

export async function getLogsSummary(date?: string): Promise<DailySummary> {
  const params = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchAPI<DailySummary>(`/logs/summary${params}`);
}

export async function createLog(food_id: number, servings: number = 1): Promise<FoodLog> {
  return fetchAPI<FoodLog>('/logs', {
    method: 'POST',
    body: JSON.stringify({ food_id, servings }),
  });
}

export async function updateLog(id: number, data: { servings?: number; logged_at?: string }): Promise<FoodLog> {
  return fetchAPI<FoodLog>(`/logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLog(id: number): Promise<void> {
  return fetchAPI<void>(`/logs/${id}`, {
    method: 'DELETE',
  });
}

// ============ DAILY TRACKING API ============

export async function getDailyData(date?: string): Promise<DailyData> {
  const params = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchAPI<DailyData>(`/daily${params}`);
}

export async function updateFasting(data: { 
  fasting_done?: boolean; 
  eating_start?: number; 
  eating_end?: number 
}): Promise<DailyData> {
  return fetchAPI<DailyData>('/daily', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function addWater(amount: number): Promise<DailyData> {
  return fetchAPI<DailyData>('/daily/water', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
