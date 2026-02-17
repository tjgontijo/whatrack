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

  sub.on('publication', (ctx: any) => {
    console.log(`[Centrifugo.subscribeTo] Publication received on ${channel}:`, ctx.data)
    onMessage(ctx.data)
  })

  sub.on('subscribed', () => {
    console.log(`[Centrifugo.subscribeTo] Successfully subscribed to ${channel}`)
  })

  sub.on('error', (ctx: any) => {
    console.error(`[Centrifugo.subscribeTo] Error on ${channel}:`, ctx)
  })

  console.log(`[Centrifugo.subscribeTo] Subscribing to channel: ${channel}`)
  sub.subscribe()
  return sub
}
