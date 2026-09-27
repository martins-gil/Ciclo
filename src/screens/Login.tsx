import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login, isLoggingIn, loginError } = useAuth()
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    try {
      await login(password)
    } catch {
      // error surfaced via loginError below
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-slate-900">
        <Lock size={26} />
      </div>
      <h1 className="mb-1 text-xl font-bold text-slate-900">FoldWise</h1>
      <p className="mb-6 text-sm text-slate-400">Introduz a palavra-passe para continuar</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Palavra-passe"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-yellow-500 focus:outline-none"
        />
        {loginError && <p className="text-sm text-red-600">{loginError.message}</p>}
        <button
          type="submit"
          disabled={isLoggingIn || !password}
          className="w-full rounded-2xl bg-yellow-400 py-3 text-base font-semibold text-slate-900 disabled:opacity-40"
        >
          {isLoggingIn ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
