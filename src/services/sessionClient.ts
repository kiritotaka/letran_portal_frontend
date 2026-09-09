import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import type { SessionResponse } from "./sessionTypes";
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://letran-portal-backend.onrender.com/api/v1"
).replace(/\/$/, "");
export const sessionClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});
let active: { revision: number; promise: Promise<void> } | null = null;
export function refreshSession(): Promise<void> {
  const snapshot = useAuthStore.getState();
  if (!snapshot.refreshToken)
    return Promise.reject(new Error("Vui lòng đăng nhập lại."));
  if (active?.revision === snapshot.revision) return active.promise;
  const revision = snapshot.revision;
  const promise = (async () => {
    try {
      const response = await sessionClient.post<SessionResponse>(
        "/auth/refresh",
        { refresh_token: snapshot.refreshToken },
      );
      if (useAuthStore.getState().revision !== revision) return;
      if (!response.data.success) throw new Error("Không thể làm mới phiên.");
      useAuthStore.getState().saveSession(response.data.data);
    } catch (error) {
      if (useAuthStore.getState().revision === revision)
        useAuthStore.getState().clearSession();
      throw error;
    } finally {
      if (active?.revision === revision) active = null;
    }
  })();
  active = { revision, promise };
  return promise;
}
