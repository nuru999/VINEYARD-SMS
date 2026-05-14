import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "";

const SESSION_KEY = "vineyard_session_cookie";

// In-memory cache so we don't hit SecureStore every request
let _sessionCookie: string | null = null;

export async function getStoredCookie(): Promise<string | null> {
  if (_sessionCookie) return _sessionCookie;
  try {
    _sessionCookie = await SecureStore.getItemAsync(SESSION_KEY);
    return _sessionCookie;
  } catch {
    return null;
  }
}

async function setStoredCookie(cookie: string) {
  _sessionCookie = cookie;
  try {
    await SecureStore.setItemAsync(SESSION_KEY, cookie);
  } catch {}
}

async function clearStoredCookie() {
  _sessionCookie = null;
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {}
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const base = BASE_URL.replace(/\/$/, "");
  const url = `${base}${path}`;
  const cookie = await getStoredCookie();
  const r = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options?.headers || {}),
    },
  });
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

  // Extract session cookie from set-cookie header
  const rawCookie = r.headers.get("set-cookie");
  if (rawCookie) {
    // Store just the name=value part (everything before the first ;)
    const cookieValue = rawCookie.split(";")[0];
    await setStoredCookie(cookieValue);
  }

  return r.json();
}

export async function signOut() {
  await apiFetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
  await clearStoredCookie();
}

export async function getSession() {
  const r = await apiFetch("/api/auth/get-session");
  if (!r.ok) return null;
  const data = await r.json();
  return data?.user ?? null;
}
