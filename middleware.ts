import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/hedefler/:path*",
    "/icerikler/:path*",
    "/zamanlama/:path*",
    "/gecmis/:path*",
    "/ayarlar/:path*",
    "/entegrasyon/:path*",
  ],
};
