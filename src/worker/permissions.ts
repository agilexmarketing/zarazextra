export function hasPermission(permission: string, permissions: string[]): boolean {
  return permissions.includes(permission) || permissions.includes(`zarazextra:${permission}`) || permissions.includes('*');
}
