import { useMemo, useState } from "react";
import {
  getAuthToken,
  isAuthenticated,
  saveAuthToken,
  clearAuthToken,
} from "./auth.utils";

export default function useAuth() {
  const [token, setToken] = useState<string | null>(getAuthToken());

  const login = (newToken: string) => {
    saveAuthToken(newToken);
    setToken(newToken);
  };

  const logout = () => {
    clearAuthToken();
    setToken(null);
  };

  const authenticated = useMemo(() => isAuthenticated(), [token]);

  return { token, authenticated, login, logout };
}
