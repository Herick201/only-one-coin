-- pg_trgm powers the trigram GIN indexes on students (name/national_id/phone
-- search, docs/ROADMAP.md Sessão 5: "busca por nome/DNI/telefone funciona").
-- Not expressible in src/schema.ts (Drizzle Kit's declarative diff has no
-- extension primitive), so it's a hand-written migration, same precedent as
-- 0001_better_auth_core.sql. Must run before the migration that creates the
-- trigram indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
