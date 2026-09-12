import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PETBSI - Gestão Ágil",
  description: "Sistema Web de Gestão Ágil do Projeto Acadêmico",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
