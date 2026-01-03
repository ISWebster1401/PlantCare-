/**
 * TypeScript types para la app móvil PlantCare
 * Basado en PROJECT_DOCUMENTATION_COMPLETE.md
 */

// ============================================
// USER TYPES
// ============================================

export interface UserResponse {
  id: number;
  full_name: string;
  email: string;
  role: string;
  role_id?: number; // ID del rol (1=user, 2=admin)
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: UserResponse;
}

export interface UserRegistration {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

// ============================================
// PLANT TYPES
// ============================================

export interface PlantResponse {
  id: number;
  user_id: number;
  sensor_id: number | null;
  plant_name: string;
  plant_type: string | null;
  scientific_name: string | null;
  care_level: string | null;
  care_tips: string | null;
  original_photo_url: string | null;
  character_image_url: string | null;
  character_personality: string | null;
  character_mood: string;
  health_status: string;
  last_watered: string | null;
  optimal_humidity_min: number | null;
  optimal_humidity_max: number | null;
  optimal_temp_min: number | null;
  optimal_temp_max: number | null;
  created_at: string;
  updated_at: string | null;
  assigned_model_id?: number | null;
  model_3d_url?: string | null;
}

export interface PlantIdentify {
  plant_type: string;
  scientific_name: string;
  care_level: string;
  care_tips: string;
  optimal_humidity_min: number;
  optimal_humidity_max: number;
  optimal_temp_min: number;
  optimal_temp_max: number;
}

// ============================================
// SENSOR TYPES (v2 con UUID)
// ============================================

export interface SensorResponse {
  id: string; // UUID como string
  device_id: string;
  user_id: number;
  plant_id: number | null;
  name: string;
  device_type: string;
  status: string; // 'active' | 'inactive' | 'maintenance'
  last_connection: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface SensorReadingResponse {
  id: string; // UUID
  sensor_id: string; // UUID
  user_id: number;
  plant_id: number | null;
  temperature: number;
  air_humidity: number;
  soil_moisture: number;
  light_intensity: number | null;
  electrical_conductivity: number | null;
  timestamp: string;
  created_at: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface NotificationResponse {
  id: number;
  user_id: number;
  plant_id: number | null;
  notification_type: string;
  message: string;
  is_read: boolean;
  sent_via_email: boolean;
  created_at: string;
  plant_name?: string | null;
  character_image_url?: string | null;
}

// ============================================
// AI TYPES
// ============================================

export interface AIResponse {
  question: string;
  response: string;
  context_type: string;
  device_info?: {
    sensor_id?: number;
    plant_id?: number;
    plant_name?: string;
    plant_type?: string;
  } | null;
  sensor_data?: {
    last_humidity?: number;
    last_temperature?: number;
    optimal_humidity_min?: number;
    optimal_humidity_max?: number;
  } | null;
  tokens_used?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  timestamp: string;
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_users: number;
  total_devices: number;
  connected_devices: number;
  unconnected_devices: number;
  active_devices: number;
  total_readings_today: number;
  total_readings_week: number;
  new_users_today: number;
  new_users_week: number;
  new_devices_today: number;
  new_devices_week: number;
}

export interface UserAdminResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  region?: string | null;
  vineyard_name?: string | null;
  hectares?: number | null;
  grape_type?: string | null;
  role_id: number;
  role_name?: string | null;
  created_at: string;
  last_login?: string | null;
  active: boolean;
  device_count: number;
}

export interface DeviceAdminResponse {
  id: number;
  device_code: string;
  name?: string | null;
  device_type: string;
  location?: string | null;
  plant_type?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  created_at: string;
  last_seen?: string | null;
  connected_at?: string | null;
  active: boolean;
  connected: boolean;
}

export interface DeviceCodeBatch {
  device_type: string;
  quantity: number;
  prefix?: string | null;
}

export interface DeviceCodeResponse {
  device_code: string;
  device_type: string;
  created_at: string;
}
