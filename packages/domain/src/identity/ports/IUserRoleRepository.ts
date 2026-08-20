import type { Role } from "../Role.js";

/**
 * Deliberadamente estreita — NÃO estende IBaseRepository<T>. Um
 * `update` genérico nessa tabela violaria a regra "role só muda pelo
 * usecase dedicado de promoção" (CLAUDE.md §8, "Gestão de cargos").
 */
export interface IUserRoleRepository {
  findRoleByUserId(userId: string): Promise<Role | null>;
  updateRole(userId: string, role: Role): Promise<void>;
}
