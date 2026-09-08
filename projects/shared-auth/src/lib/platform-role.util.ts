
export const PLATFORM_ROLE_CODE: Record<string, string> = {
  rh: 'RH_USER',
  finance: 'FINANCE_USER',
  dashboard: 'ADMIN',
};


export const ROLE_LABELS: Record<string, string> = {
  RH_USER: 'Utilisateur RH',
  FINANCE_USER: 'Utilisateur Finance',
  ADMIN: 'Administrateur',
};


export function getDisplayRole(
  roles: string[] | undefined,
  platform: keyof typeof PLATFORM_ROLE_CODE,
): string {
  if (!roles?.length) return 'Utilisateur';

  const expectedCode = PLATFORM_ROLE_CODE[platform];
  const matchedRole = roles.find((r) => r === expectedCode);

  if (matchedRole) {
    return ROLE_LABELS[matchedRole] ?? matchedRole;
  }


  const fallbackRole = roles[0];
  return ROLE_LABELS[fallbackRole] ?? fallbackRole;
}
