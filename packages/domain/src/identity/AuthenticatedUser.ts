import type { Role } from "./Role.js";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  email: string;
}
