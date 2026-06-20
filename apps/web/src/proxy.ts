import { NextResponse, type NextRequest } from "next/server";

const realm = "Cepa";

function challenge() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
    },
  });
}

export function proxy(request: NextRequest) {
  if (process.env.SITE_ACCESS_ENABLED !== "true") {
    return NextResponse.next();
  }

  const expectedUsername = process.env.SITE_ACCESS_USERNAME;
  const expectedPassword = process.env.SITE_ACCESS_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return new NextResponse("Site access is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return challenge();
  }

  let decoded = "";
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return challenge();
  }

  const separator = decoded.indexOf(":");
  const username = separator >= 0 ? decoded.slice(0, separator) : "";
  const password = separator >= 0 ? decoded.slice(separator + 1) : "";

  if (username !== expectedUsername || password !== expectedPassword) {
    return challenge();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook).*)"],
};
