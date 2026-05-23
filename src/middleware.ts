import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized({ token }) {
      return !!token
    },
  },
  pages: {
    signIn: '/api/auth/signin',
  },
})

export const config = {
  matcher: ['/:slug/admin/:path*'],
}