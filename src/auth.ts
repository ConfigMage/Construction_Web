import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            username: z.string(),
            password: z.string(),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        // Single-user validation
        if (
          parsed.data.username === process.env.ADMIN_USERNAME &&
          parsed.data.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: '1',
            name: 'Kaleb',
            email: 'jonesgcoregon@gmail.com',
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === '/login';

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
});
