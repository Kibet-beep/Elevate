import os from 'node:os'
import { spawn } from 'node:child_process'

const port = process.env.VITE_PORT ?? '5173'

function getLocalIpAddress() {
  const preferredInterfaces = Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)

  const candidates = preferredInterfaces.filter((networkInterface) => {
    return networkInterface.family === 'IPv4' && !networkInterface.internal
  })

  const preferredCandidate = candidates.find((networkInterface) => {
    return networkInterface.address.startsWith('192.168.') || networkInterface.address.startsWith('10.')
  })

  return preferredCandidate?.address ?? candidates[0]?.address
}

const host = process.env.CAPACITOR_HOST ?? getLocalIpAddress()

if (!host) {
  console.error('Unable to determine a local IPv4 address for Capacitor live reload.')
  process.exit(1)
}

const args = ['cap', 'run', 'android', '--live-reload', '--host', host, '--port', port]
console.log(`Running: npx ${args.join(' ')}`)

const child = spawn('npx', args, { stdio: 'inherit', shell: true })

child.on('exit', (exitCode) => {
  process.exit(exitCode ?? 1)
})