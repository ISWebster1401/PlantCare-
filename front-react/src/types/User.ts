export interface UserRegistration {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  region: string;
  vineyard_name: string;
  hectares: number;
  grape_type: string;
  password: string;
  confirm_password: string;
}

export interface UserResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  region: string;
  vineyard_name: string;
  hectares: number;
  grape_type: string;
  role_id: number;
  created_at: string;
  last_login: string | null;
  active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: UserResponse;
}
