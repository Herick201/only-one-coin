export interface AuditLogEntry {
  actorId: string;
  action: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  at: Date;
}

/**
 * Só `append` no tipo — a ausência de `update`/`delete` reforça, em
 * nível de tipo, a regra "audit_log append-only, sem grant de
 * UPDATE/DELETE nem para admin" (CLAUDE.md §8).
 */
export interface IAuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
}
