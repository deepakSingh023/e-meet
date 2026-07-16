import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { loginRequest, registerRequest } from '../api/authApi';
import { extractErrorMessage } from '../api/http';
import type { LoginPayload, RegisterPayload, User } from '../types/auth';

const STORAGE_KEY = 'signalling_auth';

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; user: User; token: string }
  | { type: 'ERROR'; message: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_AVATAR'; avatar: string };

function loadPersisted(): { user: User | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw);
    return { user: parsed.user ?? null, token: parsed.token ?? null };
  } catch {
    return { user: null, token: null };
  }
}

function persist(user: User, token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
}

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null };
    case 'SUCCESS':
      return { user: action.user, token: action.token, status: 'idle', error: null };
    case 'ERROR':
      return { ...state, status: 'error', error: action.message };
    case 'LOGOUT':
      return { user: null, token: null, status: 'idle', error: null };
    case 'SET_AVATAR':
      return state.user ? { ...state, user: { ...state.user, avatar: action.avatar } } : state;
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  setAvatar: (avatar: string) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersisted();
  const [state, dispatch] = useReducer(reducer, {
    user: persisted.user,
    token: persisted.token,
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    if (state.user && state.token) persist(state.user, state.token);
  }, [state.user, state.token]);

  async function login(payload: LoginPayload): Promise<boolean> {
    dispatch({ type: 'LOADING' });
    try {
      const res = await loginRequest(payload);
      const user: User = { id: res.id, username: res.username, email: payload.email, avatar: null };
      dispatch({ type: 'SUCCESS', user, token: res.token });
      return true;
    } catch (err) {
      dispatch({ type: 'ERROR', message: extractErrorMessage(err) });
      return false;
    }
  }

  async function register(payload: RegisterPayload): Promise<boolean> {
    dispatch({ type: 'LOADING' });
    try {
      // Backend returns a token directly on register, so this logs the user in immediately.
      const res = await registerRequest(payload);
      const user: User = { id: res.id, username: res.username, email: payload.email, avatar: null };
      dispatch({ type: 'SUCCESS', user, token: res.token });
      return true;
    } catch (err) {
      dispatch({ type: 'ERROR', message: extractErrorMessage(err) });
      return false;
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'LOGOUT' });
  }

  function setAvatar(avatar: string) {
    dispatch({ type: 'SET_AVATAR', avatar });
  }

  function clearError() {
    dispatch({ type: 'ERROR', message: '' });
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.token),
      login,
      register,
      logout,
      setAvatar,
      clearError,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}