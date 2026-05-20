import { prisma } from '@/lib/db/prisma'

async function main() {
  const columns: any = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'crm_deals'
  `
  console.log(JSON.stringify(columns, null, 2))
}

main()
