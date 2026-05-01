import AppRouter from "./routes/AppRouter"
import NetworkStatus from "./components/NetworkStatus"

export default function App() {
  return (
    <>
      <NetworkStatus />
      <AppRouter />
    </>
  )
}