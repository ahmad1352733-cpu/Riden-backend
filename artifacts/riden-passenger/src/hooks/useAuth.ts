import { useGetMe } from "@workspace/api-client-react";

export function useAuth() {
  const token = localStorage.getItem("riden_token");
  const { data: user, isLoading } = useGetMe({ query: { enabled: !!token, retry: false } as any });
  return { user, isLoading, token };
}
