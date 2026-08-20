// Espelha docs/ARCHITECTURE.md §3 — union fechada, nunca string livre.
export type Role = "admin" | "coordinator" | "treasury" | "student" | "guardian" | "mass_approver" | "teacher";
