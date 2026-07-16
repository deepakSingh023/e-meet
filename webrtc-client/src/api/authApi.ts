import { http } from './http';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';

export async function loginRequest(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/api/auth/login', payload);
  return data;
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/api/auth/register', payload);
  return data;
}