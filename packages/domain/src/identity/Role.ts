// Quadro de cargos do dono (07/09/2026) — união fechada, nunca string livre.
// `master` é o cargo dos donos da plataforma: só contas no domínio deles podem
// carregá-lo (checado na rota de convite via `canHoldMaster`).
export type Role =
  | "master"
  | "admin"
  | "analyst"
  | "enrollment_supervisor"
  | "academic_supervisor"
  | "teacher"
  | "sales"
  | "support"
  | "billing"
  | "student"
  | "guardian";

/** The platform owners' e-mail domain — the only accounts allowed to hold `master`. */
export const MASTER_EMAIL_DOMAIN = "nrlabsdigital.com";

/**
 * Whether this e-mail belongs to the platform owners.
 *
 * The domain answers two different questions and they are worth naming apart:
 * which accounts may carry the `master` cargo (`canHoldMaster`), and which
 * accounts may reach what belongs to whoever runs the platform rather than to
 * whoever runs the school — today, the feature-flag switchboard (CLAUDE.md §5).
 * The second one deliberately ignores the cargo: an `admin` of the Asociación
 * is not an owner, and an owner is one whatever cargo their account carries.
 */
export function isOwnerEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${MASTER_EMAIL_DOMAIN}`);
}

/** Whether this e-mail may carry the `master` cargo. */
export function canHoldMaster(email: string): boolean {
  return isOwnerEmail(email);
}
