import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { exec } from 'node:child_process'
import { config } from 'dotenv'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { promisify } from 'node:util'

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

// BACKUP R2 Configuration (Separate from Media R2)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: getRequiredEnv('BACKUP_R2_ENDPOINT'),
  credentials: {
    accessKeyId: getRequiredEnv('BACKUP_R2_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('BACKUP_R2_SECRET_ACCESS_KEY'),
  },
})

const bucketName = process.env.BACKUP_R2_BUCKET_NAME || 'backups'
const folderName = process.env.BACKUP_R2_FOLDER || 'whatrack'
const databaseUrl = getRequiredEnv('DATABASE_URL')

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `whatrack-backup-${timestamp}.sql.gz`
  
  // Ensure scratch directory exists
  const scratchDir = path.join(process.cwd(), 'scratch')
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir)
  }
  
  const filePath = path.join(scratchDir, fileName)

  console.log(`📦 Iniciando backup compactado do banco de dados (Whatrack): ${fileName}`)

  try {
    // 1. Executar pg_dump e compactar com gzip
    console.log('⏳ Gerando dump SQL compactado...')
    
    // We add --clean --if-exists so restore can overwrite existing data
    await execPromise(`pg_dump --clean --if-exists "${databaseUrl}" | gzip > "${filePath}"`)

    // 2. Upload para o R2 (Bucket de Backups)
    console.log(`📤 Fazendo upload para o R2 de BACKUP (Bucket: ${bucketName}, Pasta: ${folderName})...`)
    const fileStream = fs.createReadStream(filePath)
    
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `${folderName}/${fileName}`,
        Body: fileStream,
        ContentType: 'application/gzip',
      })
    )

    console.log(`✅ Backup concluído e salvo em: ${folderName}/${fileName}`)

    // 3. Limpar arquivo local
    fs.unlinkSync(filePath)
    console.log('🧹 Arquivo temporário local removido.')

  } catch (error) {
    console.error('❌ Falha no processo de backup:', error)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    process.exit(1)
  }
}

backupDatabase().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})
