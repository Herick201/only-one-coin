import type { AuthenticatedUser, ICurrentSessionPort, Role } from "@ooc/domain";
import { SESSION_COOKIE_NAME, type Auth } from "@/infra/auth/betterAuth.js";

export class BetterAuthCurrentSessionPort implements ICurrentSessionPort {
  constructor(private readonly auth: Auth) {}

  async resolve(sessionToken: string): Promise<AuthenticatedUser | null> {
    const session = await this.auth.api.getSession({
      headers: new Headers({ cookie: `${SESSION_COOKIE_NAME}=${sessionToken}` }),
    });

    if (!session) {
      return null;
    }

    const { user } = session;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as unknown as { role: Role }).role,
    };
  }
}
