import { useQuery } from "@tanstack/react-query";

export type UserRole = "admin" | "principal" | "teacher" | "accountant";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export function useSessionUser() {
  const { data, isLoading } = useQuery<CurrentUser | null>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const r = await fetch("/api/me", { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return {
    user: data ?? null,
    role: data?.role ?? null,
    isAdmin: data?.role === "admin",
    isPrincipal: data?.role === "principal",
    isTeacher: data?.role === "teacher",
    isAccountant: data?.role === "accountant",
    isLoading,
  };
}
