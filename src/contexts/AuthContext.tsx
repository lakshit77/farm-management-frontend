import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'manager' | 'employee'

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  farmId: string | null
  /** Per-user chat override from Supabase user_metadata.enable_chat.
   *  true/false = explicit override; null = not set, fall back to ENABLE_CHAT in config. */
  enableChat: boolean | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [farmId, setFarmId] = useState<string | null>(null)
  const [enableChat, setEnableChat] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  function applySession(session: Session | null) {
    const u = session?.user ?? null
    setUser(u)
    setRole((u?.user_metadata?.role as UserRole) ?? null)
    setFarmId((u?.user_metadata?.farm_id as string) ?? null)

    // enable_chat in metadata can be boolean true/false, string "true"/"false", or absent.
    // Supabase sometimes stores JSON booleans as strings depending on how they were set.
    const metaEnableChat = u?.user_metadata?.enable_chat
    if (metaEnableChat === true || metaEnableChat === 'true') {
      setEnableChat(true)
    } else if (metaEnableChat === false || metaEnableChat === 'false') {
      setEnableChat(false)
    } else {
      setEnableChat(null) // not set — fall back to ENABLE_CHAT in config
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, farmId, enableChat, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
