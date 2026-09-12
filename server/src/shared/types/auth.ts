export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  preferredLanguage: 'en' | 'hi' | 'bn';
  state?: string;
  district?: string;
  role: 'farmer' | 'agronomist' | 'admin';
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt?: string;
}
