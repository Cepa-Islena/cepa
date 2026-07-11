import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../supabase/migrations");
const hardeningPath = resolve(root, "20260705180223_security_hardening.sql");
const launchPath = resolve(root, "20260711120000_launch_hardening.sql");
const hardeningSql = readFileSync(hardeningPath, "utf8");
const launchSql = readFileSync(launchPath, "utf8");

function functionSql(source: string, name: string) {
  const match = source.match(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\n\\$\\$;`));

  if (!match) throw new Error(`Missing function ${name}`);
  return match[0];
}

describe("security hardening migration", () => {
  it("adds a service-role-only checkout attempt throttle", () => {
    expect(hardeningSql).toContain("create table if not exists public.checkout_attempts");
    expect(hardeningSql).toContain("alter table public.checkout_attempts enable row level security");
    expect(hardeningSql).toContain("pg_advisory_xact_lock");
    expect(hardeningSql).toContain("grant execute on function public.register_checkout_attempt(text) to service_role");
  });

  it("claims paid orders before mutating recipe counters", () => {
    const markPaidSql = functionSql(hardeningSql, "mark_order_paid");

    expect(markPaidSql).toContain("returning * into order_record");
    expect(markPaidSql).toContain("and released_at is null");
    expect(markPaidSql.indexOf("update public.orders")).toBeLessThan(markPaidSql.indexOf("sold_capacity_oz"));
  });

  it("claims released orders before decrementing reserved capacity", () => {
    const releaseSql = functionSql(hardeningSql, "release_order_reservation");

    expect(releaseSql).toContain("returning * into order_record");
    expect(releaseSql).toContain("and paid_at is null");
    expect(releaseSql.indexOf("update public.orders")).toBeLessThan(releaseSql.indexOf("reserved_capacity_oz"));
  });
});

describe("launch hardening migration", () => {
  it("collects delivery fields and ingredients", () => {
    expect(launchSql).toContain("customer_name");
    expect(launchSql).toContain("delivery_address");
    expect(launchSql).toContain("ingredients text[]");
    expect(launchSql).toContain("allergens text[]");
  });

  it("adds contact rate limits without requiring a purchase minimum", () => {
    expect(launchSql).toContain("register_contact_attempt");
    expect(launchSql).toContain("Too many contact messages");
    expect(launchSql).not.toContain("Order is below the minimum for this delivery zone");
  });

  it("keeps admin status changes inventory-safe", () => {
    expect(launchSql).toContain("admin_set_order_status");
    expect(launchSql).toContain("Only paid orders can be marked fulfilled");
    expect(launchSql).toContain("expire_stale_reservations");
  });
});
