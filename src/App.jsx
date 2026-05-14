import AppRouter from "./routes/AppRouter"
import NetworkStatus from "./components/NetworkStatus"
import { AppInitializer } from "./components/AppInitializer"

export default function App() {
  return (
    <>
      <AppInitializer />
      <NetworkStatus />
      <AppRouter />
    </>
  )
}