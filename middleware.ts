import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const mustChange = Boolean(token.mustChangePassword);
    if (mustChange && path !== "/sifre-degistir") {
      return NextResponse.redirect(new URL("/sifre-degistir", req.url));
    }

    if (!mustChange && path === "/sifre-degistir") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/hedefler/:path*",
    "/icerikler/:path*",
    "/zamanlama/:path*",
    "/gecmis/:path*",
    "/ayarlar/:path*",
    "/entegrasyon/:path*",
    "/admin/:path*",
    "/sifre-degistir",
  ],
};
