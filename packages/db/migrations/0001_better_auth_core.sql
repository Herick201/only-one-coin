-- Better Auth core schema (user/session/account/verification), generated via
-- `npx @better-auth/cli generate --config apps/api/auth.ts` and copied here as
-- a versioned migration (docs/ARCHITECTURE.md §5.6 — "migration entra na
-- esteira normal", não roda pelo `better-auth migrate` em runtime).
--
-- `role` ganha `default` e `CHECK` além do que o CLI gerou, espelhando
-- packages/domain/src/identity/Role.ts — mesmo padrão de rede usado em
-- `class_groups.seats_taken` (CLAUDE.md §5). A escrita em si continua
-- protegida por `additionalFields.role.input:false` no lado do Better Auth,
-- não por este CHECK.
create table "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null,
  "role" text not null default 'student'
    check ("role" in ('admin', 'coordinator', 'treasury', 'student', 'guardian', 'mass_approver', 'teacher'))
);

create table "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "issuer" text not null
);

create unique index "account_issuer_accountId_uidx" on "account" ("issuer", "accountId");

create table "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");
