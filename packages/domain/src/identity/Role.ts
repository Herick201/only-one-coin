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

/** Whether this e-mail may carry the `master` cargo. */
export function canHoldMaster(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${MASTER_EMAIL_DOMAIN}`);
}
