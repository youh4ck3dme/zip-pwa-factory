import { useCallback, useState } from "react";

const KEY_DEV = "ppb_is_dev";
const PASSWORD = "23513900";

export function useDeveloper() {
  const [isDev, setIsDev] = useState<boolean>(
    () => typeof window !== "undefined" && sessionStorage.getItem(KEY_DEV) === "1",
  );

  const login = useCallback((pwd: string) => {
    if (pwd === PASSWORD) {
      sessionStorage.setItem(KEY_DEV, "1");
      setIsDev(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(KEY_DEV);
    setIsDev(false);
  }, []);

  return { isDev, login, logout, password: PASSWORD };
}
