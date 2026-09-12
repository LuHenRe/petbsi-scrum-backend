import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1),
  GOOGLE_CALENDAR_ID: z.string().optional(),
})

function getEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error(
      "Variáveis de ambiente inválidas:",
      parsed.error.flatten().fieldErrors
    )
    throw new Error("Variáveis de ambiente configuradas incorretamente")
  }

  return parsed.data
}

export const env = getEnv()
