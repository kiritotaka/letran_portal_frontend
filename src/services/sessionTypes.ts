export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number | null;
  user: {
    id: string;
    email: string;
    is_super_admin: boolean;
    is_first_login: boolean;
    permissions: string[];
  };
}
export interface SessionResponse {
  success: true;
  data: SessionData;
}
export interface PasswordResponse {
  success: true;
  message: string;
  data: { password_changed: true; is_first_login: false; requires_login: true };
}
