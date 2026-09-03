export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: {
    id: number;
    name: string;
  };
}

export interface LoginResponse {
  data: AuthUser;
  expiresAt: string;
}

export interface CurrentUserResponse {
  data: AuthUser;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}