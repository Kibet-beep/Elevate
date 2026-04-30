import { Navigate } from "react-router-dom"
import { useUser } from "../hooks/useRole"

export default function AuthGuard({ children }) {
  const { user, loading } = useUser()

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )

  if (!user) return <Navigate to="/" replace />

  return children
}