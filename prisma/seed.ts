import { runSeed } from './seeds/index'

runSeed().catch((error) => {
  console.error('❌ Falha na execução do seed')
  console.error(error)
  process.exit(1)
})
