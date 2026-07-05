import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../supabase/migrations/20260705180223_security_hardening.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

function functionSql(name: string) {
  const match = migrationSql.match(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\n\\$\\$;`));

  if (!match) throw new Error(`Missing function ${name}`);
  return match[0];
}

describe("security hardening migration", () => {
  it("adds a service-role-only checkout attempt throttle", () => {
    expect(migrationSql).toContain("create table if not exists public.checkout_attempts");
    expect(migrationSql).toContain("alter table public.checkout_attempts enable row level security");
    expect(migrationSql).toContain("pg_advisory_xact_lock");
    expect(migrationSql).toContain("grant execute on function public.register_checkout_attempt(text) to service_role");
  });

  it("claims paid orders before mutating recipe counters", () => {
    const markPaidSql = functionSql("mark_order_paid");

    expect(markPaidSql).toContain("returning * into order_record");
    expect(markPaidSql).toContain("and released_at is null");
    expect(markPaidSql.indexOf("update public.orders")).toBeLessThan(markPaidSql.indexOf("sold_capacity_oz"));
  });

  it("claims released orders before decrementing reserved capacity", () => {
    const releaseSql = functionSql("release_order_reservation");

    expect(releaseSql).toContain("returning * into order_record");
    expect(releaseSql).toContain("and paid_at is null");
    expect(releaseSql.indexOf("update public.orders")).toBeLessThan(releaseSql.indexOf("reserved_capacity_oz"));
  });
});
