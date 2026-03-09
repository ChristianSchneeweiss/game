import { ConnectButton } from '@rainbow-me/rainbowkit'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/connect')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ConnectButton/>
}
