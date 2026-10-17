import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db/client.ts";
import * as schema from "#/db/schema/index.ts";

// The roles (academy, admin, auditor, judge, individual) arrive with the access
// feature (docs/domain/access.md). `tanstackStartCookies` stays last: it reads
// the cookies the plugins before it set.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
});
