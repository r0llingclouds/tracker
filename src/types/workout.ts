// Kettlebell swing entry
export interface KettlebellEntry {
  id: number;
  date: string;           // YYYY-MM-DD
  weight: number;         // kg
  series: number;         // number of sets
  reps: number;           // reps per set
  singleHanded: boolean;  // true = single hand, false = double hand
  created_at: string;
}

// Push up entry
export interface PushUpEntry {
  id: number;
  date: string;           // YYYY-MM-DD
  series: number;         // number of sets
  reps: number;           // reps per set
  created_at: string;
}

// Form data for creating/updating kettlebell entries
export interface KettlebellFormData {
  weight: number;
  series: number;
  reps: number;
  singleHanded: boolean;
}

// Form data for creating/updating push up entries
export interface PushUpFormData {
  series: number;
  reps: number;
}

// Daily workout timer data
export interface DailyWorkoutData {
  date: string;
  kettlebell_time: number;  // seconds
  pushup_time: number;      // seconds
}

// Daily workout summary
export interface WorkoutSummary {
  // Kettlebell
  kettlebell_total_reps: number;      // series * reps
  kettlebell_total_volume: number;    // weight * series * reps * (singleHanded ? 1 : 2)
  kettlebell_total_time: number;      // from daily timer
  kettlebell_entries: number;
  // Push ups
  pushup_total_reps: number;          // series * reps
  pushup_total_time: number;          // from daily timer
  pushup_entries: number;
}
