import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    /** Kamuya açık yönetici girişi */
    if (path === "/admin/login") {
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (token) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    /** Admin paneli — oturum yoksa yönetici girişine */
    if (path.startsWith("/admin") && !token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    /** Admin rotaları — yalnızca ADMIN */
    if (path === "/admin" || path.startsWith("/admin/")) {
      if (token && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

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

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname;
        if (p === "/admin/login") return true;
        if (p.startsWith("/admin")) return true;
        return Boolean(token);
      },
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: [
    "/admin",
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
