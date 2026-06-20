"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAdmin } from "@/app/admin/actions";

export default function AdminLoginPage() {
  const [message, action, pending] = useActionState(signInAdmin, null);

  return (
    <main className="utility-page admin-login">
      <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
      <h1>Admin login</h1>
      <form className="admin-form" action={action}>
        <label>
          <span>Email</span>
          <input name="email" type="email" required />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" minLength={8} required />
        </label>
        {message ? <p className="form-status error">{message}</p> : null}
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <Link href="/">Back to shop</Link>
    </main>
  );
}
