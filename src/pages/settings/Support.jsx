import { useNavigate } from "react-router-dom"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function Support() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }

  return (
    <AppShell
      title="Support"
      subtitle="Need help? Reach out through any channel below"
      showHeader={false}
      right={<UiButton variant="secondary" size="sm" onClick={goBack} aria-label="Back">←</UiButton>}
    >
      <div className="space-y-4">
        <UiCard className="p-4 space-y-3">
          <p className="text-zinc-300 text-sm">Need help? Reach out through any channel below.</p>
          <p className="text-zinc-500 text-sm">Email: support@elevate.app</p>
          <p className="text-zinc-500 text-sm">Phone: +254 700 000 000</p>
          <p className="text-zinc-500 text-sm">Hours: Mon-Fri, 8:00 AM - 6:00 PM</p>
        </UiCard>
      </div>
    </AppShell>
  )
}
