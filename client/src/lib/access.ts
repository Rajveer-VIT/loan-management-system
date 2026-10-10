import { ROLES } from '../types';

/**
 * Client-side mirror of the server's MODULE_ACCESS map. Used to build navigation and to
 * guard routes so a user who types another module's URL is redirected. This is UX only:
 * the API enforces the same rules and rejects unauthorized calls with 403.
 */
export type DashboardModule = 'sales' | 'sanction' | 'disbursement' | 'collection';

export const DASHBOARD_MODULES: ReadonlyArray<{
  key: DashboardModule;
  label: string;
  href: string;
  roles: readonly ROLES[];
}> = [
  { key: 'sales', label: 'Sales', href: '/dashboard/sales', roles: [ROLES.ADMIN, ROLES.SALES] },
  { key: 'sanction', label: 'Sanction', href: '/dashboard/sanction', roles: [ROLES.ADMIN, ROLES.SANCTION] },
  { key: 'disbursement', label: 'Disbursement', href: '/dashboard/disbursement', roles: [ROLES.ADMIN, ROLES.DISBURSEMENT] },
  { key: 'collection', label: 'Collection', href: '/dashboard/collection', roles: [ROLES.ADMIN, ROLES.COLLECTION] },
];

export function isStaff(role: ROLES): boolean {
  return role !== ROLES.BORROWER;
}

export function modulesFor(role: ROLES) {
  return DASHBOARD_MODULES.filter((m) => m.roles.includes(role));
}

/** The module a dashboard path belongs to, or null for `/dashboard` itself. */
export function moduleForPath(pathname: string) {
  return DASHBOARD_MODULES.find((m) => pathname === m.href || pathname.startsWith(`${m.href}/`)) ?? null;
}

/**
 * Whether `role` may view `pathname`. `/dashboard` is open to all staff (it redirects or
 * shows the Admin overview); module pages need the module's roles; borrower pages
 * (`/apply`, `/my-loans`) are for borrowers only.
 */
export function canAccessPath(role: ROLES, pathname: string): boolean {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (!isStaff(role)) return false;
    const mod = moduleForPath(pathname);
    return mod ? mod.roles.includes(role) : true;
  }
  if (pathname.startsWith('/apply') || pathname.startsWith('/my-loans')) {
    return role === ROLES.BORROWER;
  }
  return true;
}

/** Where a user lands after login. */
export function homePathFor(role: ROLES): string {
  if (role === ROLES.BORROWER) return '/my-loans';
  if (role === ROLES.ADMIN) return '/dashboard';
  return modulesFor(role)[0]?.href ?? '/dashboard';
}
