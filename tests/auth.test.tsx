import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { act, render, waitFor, cleanup } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { useAuthStore } from "../src/stores/authStore";
import { sessionClient, refreshSession } from "../src/services/sessionClient";
import { axiosClient } from "../src/services/axiosClient";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { authApi } from "../src/services/api";
import type { SessionData } from "../src/services/sessionTypes";

const data = (token = "access", first = false): SessionData => ({
  access_token: token,
  refresh_token: "refresh-" + token,
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "user-1",
    email: "user@example.com",
    is_super_admin: false,
    is_first_login: first,
    permissions: ["users.read"],
  },
});
beforeEach(() => {
  useAuthStore.getState().clearSession();
  useAuthStore.getState().setLoading(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("persists both tokens together, but never uses localStorage", () => {
  useAuthStore.getState().saveSession(data());
  expect(
    JSON.parse(sessionStorage.getItem("letran_session_v1")!).refresh_token,
  ).toBe("refresh-access");
  expect(localStorage.getItem("auth_token")).toBeNull();
  useAuthStore.getState().clearSession();
  expect(sessionStorage.getItem("letran_session_v1")).toBeNull();
});
it("shares refresh across concurrent calls and rotates both tokens", async () => {
  useAuthStore.getState().saveSession(data());
  const post = vi
    .spyOn(sessionClient, "post")
    .mockResolvedValue({ data: { success: true, data: data("new") } } as any);
  await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
  expect(post).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().refreshToken).toBe("refresh-new");
});
it("cannot restore a session after logout", async () => {
  useAuthStore.getState().saveSession(data());
  let resolve: any;
  vi.spyOn(sessionClient, "post").mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }) as any,
  );
  const pending = refreshSession();
  useAuthStore.getState().clearSession();
  resolve({ data: { success: true, data: data("new") } });
  await pending;
  expect(useAuthStore.getState().token).toBeNull();
});
it("clears session when refresh fails without retrying", async () => {
  useAuthStore.getState().saveSession(data());
  const post = vi
    .spyOn(sessionClient, "post")
    .mockRejectedValue(new Error("expired"));
  await expect(refreshSession()).rejects.toThrow("expired");
  expect(post).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().token).toBeNull();
});
it("does not grant admin from a wildcard on an ordinary user", () => {
  const session = data();
  session.user.permissions = ["*"];
  useAuthStore.getState().saveSession(session);
  expect(useAuthStore.getState().hasPermission("users.delete")).toBe(false);
});
it("blocks permissions during first-login password change", () => {
  const session = data("access", true);
  session.user.is_super_admin = true;
  useAuthStore.getState().saveSession(session);
  expect(useAuthStore.getState().hasPermission("users.read")).toBe(false);
});
it("retries a protected request once with refreshed token", async () => {
  useAuthStore.getState().saveSession(data());
  const refresh = vi
    .spyOn(sessionClient, "post")
    .mockResolvedValue({ data: { success: true, data: data("new") } } as any);
  let count = 0;
  const adapter = vi.fn(async (config: any) => {
    count++;
    if (count === 1)
      throw new AxiosError(
        "expired",
        "ERR_BAD_REQUEST",
        config,
        {},
        {
          status: 401,
          data: {},
          statusText: "Unauthorized",
          headers: new AxiosHeaders(),
          config,
        },
      );
    expect(config.headers.Authorization).toBe("Bearer new");
    return {
      status: 200,
      data: { ok: true },
      statusText: "OK",
      headers: new AxiosHeaders(),
      config,
    };
  });
  const response = await axiosClient.get("/users", {
    adapter,
    skipLoading: true,
    skipGlobalError: true,
  });
  expect(response).toEqual({ ok: true });
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(refresh).toHaveBeenCalledTimes(1);
});
it("never refreshes on login 401 or permission 403", async () => {
  useAuthStore.getState().saveSession(data());
  const refresh = vi.spyOn(sessionClient, "post");
  for (const [url, status] of [
    ["/auth/login", 401],
    ["/users", 403],
  ] as const) {
    const adapter = async (config: any) => {
      throw new AxiosError(
        "denied",
        "ERR_BAD_REQUEST",
        config,
        {},
        {
          status,
          data: {},
          statusText: "Denied",
          headers: new AxiosHeaders(),
          config,
        },
      );
    };
    await expect(
      axiosClient.post(
        url,
        {},
        { adapter, skipLoading: true, skipGlobalError: true },
      ),
    ).rejects.toThrow();
  }
  expect(refresh).not.toHaveBeenCalled();
  expect(useAuthStore.getState().token).toBe("access");
});
it("revalidates stored sessions when the provider mounts", async () => {
  useAuthStore.getState().saveSession(data());
  const refresh = vi
    .spyOn(sessionClient, "post")
    .mockResolvedValue({
      data: { success: true, data: data("restored") },
    } as any);
  render(
    <AuthProvider>
      <div>App</div>
    </AuthProvider>,
  );
  await waitFor(() => expect(useAuthStore.getState().token).toBe("restored"));
  expect(refresh).toHaveBeenCalledTimes(1);
});
it("auto-login uses the real login response after password change", async () => {
  let auth: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return null;
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  vi.spyOn(authApi, "changePasswordFirstLogin").mockResolvedValue({
    success: true,
    message: "done",
    data: {
      password_changed: true,
      is_first_login: false,
      requires_login: true,
    },
  });
  const login = vi
    .spyOn(authApi, "login")
    .mockResolvedValue({ success: true, data: data("changed") });
  await act(async () => {
    expect(
      (
        await auth!.changePasswordFirstLogin(
          "user@example.com",
          "old",
          "new-password",
        )
      ).success,
    ).toBe(true);
  });
  expect(login).toHaveBeenCalledWith("user@example.com", "new-password");
  expect(useAuthStore.getState().token).toBe("changed");
});
