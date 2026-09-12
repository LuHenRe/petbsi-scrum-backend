export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">PETBSI — Gestão Ágil</h1>
      <p className="mt-4 text-lg text-gray-600">
        Sistema Web de Gestão Ágil do Projeto Acadêmico
      </p>
      <div className="mt-8">
        <a
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Entrar
        </a>
      </div>
    </main>
  )
}
