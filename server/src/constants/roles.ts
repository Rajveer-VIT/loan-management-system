export enum ROLES {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  SANCTION = 'SANCTION',
  DISBURSEMENT = 'DISBURSEMENT',
  COLLECTION = 'COLLECTION',
  BORROWER = 'BORROWER',
}

/** Roles that work in the operations dashboard (everyone except borrowers). */
export const STAFF_ROLES: readonly ROLES[] = [
  ROLES.ADMIN,
  ROLES.SALES,
  ROLES.SANCTION,
  ROLES.DISBURSEMENT,
  ROLES.COLLECTION,
];

/**
 * Dashboard module → roles allowed to use it. Admin is listed explicitly on every
 * module rather than bypassing checks, so each route declares exactly who may call it.
 */
export const MODULE_ACCESS = {
  sales: [ROLES.ADMIN, ROLES.SALES],
  sanction: [ROLES.ADMIN, ROLES.SANCTION],
  disbursement: [ROLES.ADMIN, ROLES.DISBURSEMENT],
  collection: [ROLES.ADMIN, ROLES.COLLECTION],
  borrower: [ROLES.BORROWER],
} as const satisfies Record<string, readonly ROLES[]>;
