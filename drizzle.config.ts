import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations/",
  // Only the app schema: `public` holds extensions, `pgboss` the job queue,
  // `drizzle` the migration journal (ADR-0021).
  schemaFilter: ["enescena"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
