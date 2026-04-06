import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    /** /admin → yönetici giriş adresine */
    if (path === "/admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    /** Kamuya açık yönetici girişi (token gerekmez) */
    if (path === "/admin/login") {
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/kullanicilar", req.url));
      }
      if (token) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
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

    if (path.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname;
        if (p === "/admin" || p === "/admin/login") return true;
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
