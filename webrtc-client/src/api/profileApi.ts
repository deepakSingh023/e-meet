import { API_BASE_URL, http } from './http';
import type { MetaDataResponse } from '../types/profile';

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  // /api/profile/update reads the principal off Authentication, so this one
  // does need a token — the http interceptor attaches it if we have one.
  const { data } = await http.post<string>('/api/profile/update', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // e.g. "/images/<uuid>.jpg"
}

/**
 * Tags the room in Redis with whoever is entering it (id/username/avatar).
 * Auth is optional here: if the user is logged in the interceptor attaches
 * a token and the backend records their identity; if not, it's still safe
 * to call — the backend falls back to "unknown" for that slot. Callers
 * should fire this and swallow errors rather than block navigation on it.
 */
export async function updateRoomMetadata(roomId: string): Promise<void> {
  await http.post('/api/profile/update-metadata', null, {
    params: { roomId },
  });
}

/**
 * Fetches the *other* participant's identity for a room (whichever slot
 * isn't the caller, per ProfileService.getMetadata). Used once signaling
 * confirms the peer is actually there — see useSocketHandlers.
 */
export async function getRoomMetadata(roomId: string): Promise<MetaDataResponse> {
  const { data } = await http.get<MetaDataResponse>('/api/profile/get-metadata', {
    params: { roomId },
  });
  return data;
}

export function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
}