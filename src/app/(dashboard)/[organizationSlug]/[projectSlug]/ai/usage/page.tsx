import AiPage from '../../ia/page'

export default function AiUsagePage() {
  return <AiPage searchParams={Promise.resolve({ tab: 'usage' })} />
}
