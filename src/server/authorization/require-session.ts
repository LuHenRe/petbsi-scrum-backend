import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth-options"
import { db } from "@db/client"

export interface AuthenticatedUser {
  personId: string
  email: string
  displayName: string
}

export async function requireSession(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const person = await db.person.findUnique({
    where: { email: session.user.email },
  })

  if (!person) {
    redirect("/login")
  }

  return {
    personId: person.id,
    email: person.email,
    displayName: person.displayName,
  }
}

export async function getOptionalSession(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return null
  }

  const person = await db.person.findUnique({
    where: { email: session.user.email },
  })

  if (!person) {
    return null
  }

  return {
    personId: person.id,
    email: person.email,
    displayName: person.displayName,
  }
}
