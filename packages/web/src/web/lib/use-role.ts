import { useQuery } from "@tanstack/react-query";

export type UserRole = "admin" | "principal" | "teacher";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export function useRole() {
  const { data, isLoading } = useQuery<CurrentUser>({
    queryKey: ["current-user-role"],
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
    isLoading,
  };
}
