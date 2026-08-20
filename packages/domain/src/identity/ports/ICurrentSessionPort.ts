import type { AuthenticatedUser } from "../AuthenticatedUser.js";

/**
 * Recebe uma string opaca (o valor do cookie de sessão) — nunca
 * `Headers`/`FastifyRequest`. Extrair o cookie da requisição é
 * responsabilidade da camada HTTP em apps/api; o domínio não sabe o
 * que é HTTP.
 */
export interface ICurrentSessionPort {
  resolve(sessionToken: string): Promise<AuthenticatedUser | null>;
}
