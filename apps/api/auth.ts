import { loadConfig } from "./src/config.js";
import { createAuth } from "./src/infra/auth/betterAuth.js";

export const auth = createAuth(loadConfig());
