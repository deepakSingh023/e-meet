export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

export interface AuthResponse {
  id: string;
  username: string;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface PersistedAuth {
  user: User;
  token: string;
}