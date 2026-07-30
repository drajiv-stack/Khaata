import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.isActive) return null

        const passwordsMatch = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (passwordsMatch) {
          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              lastLoginAt: new Date(),
              failedLoginCount: 0 
            }
          })
          
          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role
          }
        } else {
          // Increment failed login count
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount: { increment: 1 } }
          })
          return null
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        ;(session.user as any).role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
})
