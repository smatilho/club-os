export interface AuthClaims {
  sub: string;
  organizationId: string;
  email?: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface AuthClaimsPort {
  verify(token: string): Promise<AuthClaims>;
  decode(token: string): AuthClaims;
}
