import Constants from "expo-constants";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "";

async function authFetch(path: string, options?: RequestInit) {
  const url = `${BASE_URL.replace(/\/$/, "")}${path}`;
  const r = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  return r;
}

export async function signIn(email: string, password: string) {
  const r = await authFetch("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as any).message || "Sign in failed");
  }
  return r.json();
}

export async function signOut() {
  await authFetch("/api/auth/sign-out", { method: "POST" });
}

export async function getSession() {
  const r = await authFetch("/api/auth/get-session");
  if (!r.ok) return null;
  const data = await r.json();
  return data?.user ?? null;
}
