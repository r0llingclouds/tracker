// Food item stored in the database
export interface Food {
  id: number;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  sodium: number;
  caffeine: number;
  total_grams: number | null;
  is_supplement: boolean;
  created_at: string;
}

// Food log entry
export interface FoodLog {
  id: number;
  food_id: number;
  servings: number;
  logged_at: string;
  // Joined from food
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  sodium: number;
  caffeine: number;
  total_grams: number | null;
  is_supplement: boolean;
}

// Daily tracking data (fasting, water)
export interface DailyData {
  date: string;
  fasting_done: boolean;
  eating_start: number;
  eating_end: number;
  water_ml: number;
}

// Daily nutrition summary
export interface DailySummary {
  total_kcal: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  total_sodium: number;
  total_caffeine: number;
  total_entries: number;
}

// Food form data for creating/updating
export interface FoodFormData {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  sodium: number;
  caffeine: number;
  total_grams: number | null;
  is_supplement: boolean;
}

// Parsed food data from AI
export interface ParsedFood {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  sodium: number;
  caffeine: number;
  total_grams?: number | null;
  is_supplement?: boolean;
}

// Meal lookup response
export interface MealLookupResponse {
  parsed: ParsedFood;
  rawQuery?: string;
  rawResponse?: string;
  sources?: string[];
}
