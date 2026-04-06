import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    mustChangePassword?: boolean;
  }
}
