import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "";

const COOKIE_KEY = "vineyard_session_cookie";
const TOKEN_KEY = "vineyard_session_token";

// In-memory cache
let _sessionCookie: string | null = null;
let _sessionToken: string | null = null;

export async function getStoredAuth(): Promise<{
  cookie: string | null;
  token: string | null;
}> {
  if (!_sessionCookie && !_sessionToken) {
    try {
      _sessionCookie = await SecureStore.getItemAsync(COOKIE_KEY);
      _sessionToken = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {}
  }
  return { cookie: _sessionCookie, token: _sessionToken };
}

async function setStoredAuth(cookie: string | null, token: string | null) {
  _sessionCookie = cookie;
  _sessionToken = token;
  try {
    if (cookie) await SecureStore.setItemAsync(COOKIE_KEY, cookie);
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {}
}

async function clearStoredAuth() {
  _sessionCookie = null;
  _sessionToken = null;
  try {
    await SecureStore.deleteItemAsync(COOKIE_KEY);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const base = BASE_URL.replace(/\/$/, "");
  const url = `${base}${path}`;
  const { cookie, token } = await getStoredAuth();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  // Prefer cookie auth (same as web), fallback to Bearer
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const r = await fetch(url, { ...options, headers });
  return r;
}

export async function signIn(email: string, password: string) {
  const base = BASE_URL.replace(/\/$/, "");
  const r = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as any).message || "Sign in failed");
  }

  const data = await r.json();

  // Store the session token from response body (most reliable for RN)
  const token: string | null = data?.token ?? null;

  // Also try to grab cookie from headers (works in RN native)
  let cookie: string | null = null;
  try {
    const rawCookie = r.headers.get("set-cookie");
    if (rawCookie) {
      cookie = rawCookie.split(";")[0]; // "name=value" part only
    }
  } catch {}

  await setStoredAuth(cookie, token);
  return data;
}

export async function signOut() {
  await apiFetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
  await clearStoredAuth();
}

export async function getSession() {
  const r = await apiFetch("/api/auth/get-session");
  if (!r.ok) return null;
  const data = await r.json();
  return data?.user ?? null;
}
