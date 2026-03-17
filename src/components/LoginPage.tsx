import { useState, FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #EEF2EC 0%, #F7F7F7 50%, #F8F5EE 100%)' }}
    >
      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="relative">
            {/* Soft glow ring */}
            <div
              className="absolute inset-0 rounded-2xl opacity-30 blur-lg"
              style={{ background: '#4F6D4F', transform: 'scale(1.15)' }}
            />
            <img
              src="/logo.svg"
              alt="ShowGroundsLive"
              className="relative w-16 h-16 rounded-2xl shadow-card"
              width={64}
              height={64}
            />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-accent-green-dark tracking-tight leading-tight">
              ShowGroundsLive
            </h1>
            <p className="font-body text-sm text-text-secondary mt-0.5">
              Farm &amp; Show Management
            </p>
          </div>
        </div>

        {/* Form card */}
        <div
          className="bg-surface-card rounded-card-lg border border-border-card shadow-card px-6 py-7 sm:px-8 sm:py-8"
        >
          <h2 className="font-heading text-lg font-semibold text-text-primary mb-1">
            Sign in
          </h2>
          <p className="font-body text-sm text-text-secondary mb-6">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-body text-sm font-medium text-text-primary mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border-card bg-background-primary font-body text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-accent-green transition"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block font-body text-sm font-medium text-text-primary mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border-card bg-background-primary font-body text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-accent-green transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-semantic-warning-bg border border-warm-orange-brown/30 rounded-lg px-3.5 py-2.5">
                <svg
                  className="shrink-0 mt-0.5 text-warm-rust"
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M7.5 1a6.5 6.5 0 1 0 0 13A6.5 6.5 0 0 0 7.5 1zM7 4.5a.5.5 0 0 1 1 0v4a.5.5 0 0 1-1 0v-4zm.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"
                    fill="currentColor"
                  />
                </svg>
                <p className="font-body text-sm text-warm-rust leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg font-body text-sm font-semibold text-text-on-dark bg-accent-green hover:bg-accent-green-dark disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center font-body text-xs text-text-secondary mt-6">
          Access is by invitation only
        </p>
      </div>
    </div>
  )
}
