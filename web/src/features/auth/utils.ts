import type { AuthState, AuthUser } from "../../api";

export type EditableUser = AuthUser & { uuid?: string; password?: string } & Record<string, unknown>;
export type AuthData = { users: EditableUser[] } & Record<string, unknown>;
export type TokenAuth = { type: "token"; value: string; user?: AuthUser };

export const isAuthData = (value: unknown): value is AuthData => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as { users?: unknown };
  if (!Array.isArray(record.users)) {
    return false;
  }
  return record.users.every((user) => user && typeof user === "object");
};

export const isTokenAuth = (value: AuthState | null | undefined): value is TokenAuth => {
  return !!value && value.type === "token";
};
