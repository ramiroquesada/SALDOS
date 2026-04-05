import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a2e] px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="text-5xl">💰</div>
          <h1 className="mt-4 text-2xl font-bold text-white">
            Nuestras Finanzas
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Control de finanzas para parejas
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <p className="mb-4 text-center text-sm text-gray-500">
            Iniciá sesión para continuar
          </p>
          <GoogleLoginButton />
        </div>
      </div>
    </main>
  )
}
