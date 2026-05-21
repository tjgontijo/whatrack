import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { exec } from 'node:child_process'
import { config } from 'dotenv'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { Readable } from 'node:stream'
import * as readline from 'node:readline'

const execPromise = promisify(exec)

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envPath = path.resolve(process.cwd(), '.env')

if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath })
} else {
  config({ path: envPath })
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} environment variable`)
  return value
}

// R2 Configuration for Restore (Uses same credentials but targets backup bucket/folder)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: getRequiredEnv('R2_ENDPOINT'),
  credentials: {
    accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
  },
})

// Hardcoded for restore since Coolify manages the backup destination
const bucketName = 'backups'
const folderName = 'whatrack'
const databaseUrl = getRequiredEnv('DATABASE_URL')

async function listBackups() {
  const response = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${folderName}/`,
    })
  )

  const files = (response.Contents || [])
    .filter(f => f.Key?.endsWith('.gz'))
    .sort((a, b) => (a.LastModified?.getTime() || 0) - (b.LastModified?.getTime() || 0))

  return files
}

async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close()
    resolve(ans)
  }))
}

async function restoreDatabase(backupKey?: string) {
  let selectedKey = backupKey

  if (!selectedKey) {
    console.log(`🔍 Buscando backups disponíveis no R2 (Bucket: ${bucketName}, Pasta: ${folderName})...`)
    const backups = await listBackups()
    
    if (backups.length === 0) {
      console.log(`❌ Nenhum backup encontrado em ${folderName}/`)
      return
    }

    console.log('\n--- Backups Disponíveis ---')
    
    // Cabeçalho da Tabela
    const head = { id: '#', file: 'Arquivo', size: 'Tamanho', date: 'Data', time: 'Hora' }
    console.log(`${head.id.padEnd(4)} | ${head.file.padEnd(45)} | ${head.size.padEnd(10)} | ${head.date.padEnd(10)} | ${head.time}`)
    console.log(`${'-'.repeat(4)}-+-${'-'.repeat(45)}-+-${'-'.repeat(10)}-+-${'-'.repeat(10)}-+-${'-'.repeat(8)}`)

    const displayBackups = backups.slice(-15)
    displayBackups.forEach((b, i) => {
      const id = (i + 1).toString().padEnd(4)
      const file = (b.Key?.replace(`${folderName}/`, '') || '').padEnd(45)
      const size = `${(b.Size! / 1024 / 1024).toFixed(2)} MB`.padEnd(10)
      
      const fullDate = b.LastModified!
      const date = fullDate.toLocaleDateString('pt-BR').padEnd(10)
      const time = fullDate.toLocaleTimeString('pt-BR')
      
      console.log(`${id} | ${file} | ${size} | ${date} | ${time}`)
    })
    
    const answer = await askQuestion('\nDigite o número do backup que deseja restaurar (ou "c" para cancelar): ')
    
    if (answer.toLowerCase() === 'c') {
      console.log('Operação cancelada.')
      return
    }

    const index = parseInt(answer) - 1
    if (isNaN(index) || index < 0 || index >= displayBackups.length) {
      console.log('❌ Opção inválida.')
      return
    }

    selectedKey = displayBackups[index].Key!
  }

  const fileName = path.basename(selectedKey)
  const scratchDir = path.join(process.cwd(), 'scratch')
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir)
  const downloadPath = path.join(scratchDir, fileName)

  try {
    console.log(`\n📥 Baixando backup: ${selectedKey}...`)
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: selectedKey,
      })
    )

    const stream = response.Body as Readable
    const fileStream = fs.createWriteStream(downloadPath)
    
    await new Promise((resolve, reject) => {
      stream.pipe(fileStream).on('finish', () => resolve(undefined)).on('error', reject)
    })

    console.log('⏳ Limpando banco de dados atual (Resetando schema public)...')
    const dropSchemaCmd = `psql "${databaseUrl}" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"`
    await execPromise(dropSchemaCmd)

    console.log('⏳ Aplicando backup (isso pode levar alguns segundos)...')
    await execPromise(`gunzip -c "${downloadPath}" | psql "${databaseUrl}"`)

    console.log('✅ Restauração concluída com sucesso!')
    fs.unlinkSync(downloadPath)

  } catch (error) {
    console.error('❌ Falha na restauração:', error)
    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath)
    process.exit(1)
  }
}

const arg = process.argv[2]
restoreDatabase(arg).catch(console.error)
