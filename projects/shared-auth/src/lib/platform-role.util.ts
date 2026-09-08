export const PLATFORM_ROLE_MAP: Record<string, string> = {
  rh: 'RH_USER',
  finance: 'FINANCE_USER',
  dashboard: 'DASHBOARD_USER',
};


export function getDisplayRole(
  roles: string[] | undefined,
  platform: keyof typeof PLATFORM_ROLE_MAP,
): string {
  if (!roles?.length) return 'Utilisateur';
  const expectedRole = PLATFORM_ROLE_MAP[platform];
  return roles.find((r) => r === expectedRole) ?? roles[0];
}
