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

  sub.on('publication', (ctx) => {
    onMessage(ctx.data)
  })

  sub.subscribe()
  return sub
}
