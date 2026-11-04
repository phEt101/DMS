import { request } from "../../../services/api";
import type {
  CurrentUserResponse,
  LoginCredentials,
  LoginResponse,
} from "../types/auth.types";

export function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  }) as Promise<LoginResponse>;
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return request("/auth/me") as Promise<CurrentUserResponse>;
}

export function logout(): Promise<null> {
  return request("/auth/logout", {
    method: "POST",
  }) as Promise<null>;
}

export function updateProfile(input: { firstName: string; lastName: string }): Promise<CurrentUserResponse> {
  return request("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  }) as Promise<CurrentUserResponse>;
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<null> {
  return request("/auth/password", {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<null>;
}
