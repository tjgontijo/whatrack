import { Centrifuge } from 'centrifuge'

export function createCentrifugoClient(token: string) {
  const client = new Centrifuge(process.env.NEXT_PUBLIC_CENTRIFUGO_URL!, {
    token,
  })

  return client
}

export function subscribeTo(
  client: Centrifuge,
  channel: string,
  onMessage: (data: any) => void,
) {
  const sub = client.newSubscription(channel)

  // Centrifuge v5 events
  sub.on('subscribed', (ctx: any) => {
    console.log(`[Centrifugo] ✅ Subscribed to ${channel}`, ctx)
  })

  sub.on('subscribing', (ctx: any) => {
    console.log(`[Centrifugo] 🔄 Subscribing to ${channel}...`, ctx)
  })

  sub.on('unsubscribed', (ctx: any) => {
    console.log(`[Centrifugo] ⚠️ Unsubscribed from ${channel}`, ctx)
  })

  sub.on('publication', (ctx: any) => {
    console.log(`[Centrifugo] 📨 Message on ${channel}:`, ctx.data)
    onMessage(ctx.data)
  })

  sub.on('error', (ctx: any) => {
    console.error(`[Centrifugo] ❌ Subscription error on ${channel}:`, ctx)
  })

  console.log(`[Centrifugo] Starting subscription to: ${channel}`)
  sub.subscribe()
  return sub
}
