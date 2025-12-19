'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'

// Leaflet não funciona com SSR
const LocationPicker = dynamic(
  () => import('@/components/ui/location-picker').then((mod) => mod.LocationPicker),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-lg border bg-muted animate-pulse" /> }
)
import {
  Send,
  Loader2,
  MessageSquare,
  Image,
  MapPin,
  Upload,
  X,
  FileAudio,
  Video,
  FileText,
  Sticker,
  Contact,
  BarChart3,
  LayoutList,
  MousePointerClick,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import type { WhatsappInstance } from '@/schemas/whatsapp'
import { ScrollArea } from '@/components/ui/scroll-area'

type MessageType =
  | 'text'
  | 'image'
  | 'location'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'contact'
  | 'poll'
  | 'buttons'
  | 'list'

const MESSAGE_TYPE_OPTIONS: { value: MessageType; label: string; icon: typeof MessageSquare }[] = [
  { value: 'text', label: 'Texto', icon: MessageSquare },
  { value: 'image', label: 'Imagem', icon: Image },
  { value: 'audio', label: 'Áudio', icon: FileAudio },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'document', label: 'Documento', icon: FileText },
  { value: 'sticker', label: 'Sticker', icon: Sticker },
  { value: 'location', label: 'Localização', icon: MapPin },
  { value: 'contact', label: 'Contato', icon: Contact },
  { value: 'poll', label: 'Enquete (grupos)', icon: BarChart3 },
  { value: 'buttons', label: 'Botões', icon: MousePointerClick },
  { value: 'list', label: 'Lista', icon: LayoutList },
]

interface TestMessageDialogProps {
  instance: WhatsappInstance
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TestMessageDialog({ instance, open, onOpenChange }: TestMessageDialogProps) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [phone, setPhone] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('text')
  const [isSending, setIsSending] = useState(false)

  // Text
  const [textMessage, setTextMessage] = useState('Olá! Esta é uma mensagem de teste do WhaTrack.')

  // Media (image, audio, video, document, sticker)
  const [mediaBase64, setMediaBase64] = useState<string | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaCaption, setMediaCaption] = useState('')
  const [mediaFilename, setMediaFilename] = useState('')
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Location
  const [latitude, setLatitude] = useState('-15.7942')
  const [longitude, setLongitude] = useState('-47.8822')
  const [locationName, setLocationName] = useState('')

  // Contact
  const [contactName, setContactName] = useState('João Silva')
  const [contactPhone, setContactPhone] = useState('61999999999')

  // Poll
  const [pollQuestion, setPollQuestion] = useState('Qual opção você prefere?')
  const [pollOptions, setPollOptions] = useState(['Opção 1', 'Opção 2', 'Opção 3'])

  // Buttons
  type ButtonType = 'quickreply' | 'url' | 'call'
  type ButtonItem = { text: string; type: ButtonType; url?: string; phoneNumber?: string }
  const [buttonsTitle, setButtonsTitle] = useState('Escolha uma opção')
  const [buttonsBody, setButtonsBody] = useState('Clique em um dos botões abaixo')
  const [buttons, setButtons] = useState<ButtonItem[]>([
    { text: 'Sim', type: 'quickreply' },
    { text: 'Não', type: 'quickreply' },
  ])

  // List
  const [listTopText, setListTopText] = useState('Menu de opções')
  const [listDesc, setListDesc] = useState('Selecione uma opção da lista')
  const [listButtonText, setListButtonText] = useState('Ver opções')
  const [listItems, setListItems] = useState([
    { rowId: '1', title: 'Item 1', desc: 'Descrição do item 1' },
    { rowId: '2', title: 'Item 2', desc: 'Descrição do item 2' },
  ])

  const instanceLabel = instance.label || instance.instanceId || instance.id

  const getAcceptedFileTypes = () => {
    switch (messageType) {
      case 'image':
        return 'image/*'
      case 'audio':
        return 'audio/*'
      case 'video':
        return 'video/*'
      case 'sticker':
        return 'image/webp,video/mp4'
      case 'document':
        return '*/*'
      default:
        return '*/*'
    }
  }

  const getMaxFileSize = () => {
    switch (messageType) {
      case 'video':
        return 16 * 1024 * 1024 // 16MB
      case 'document':
        return 100 * 1024 * 1024 // 100MB
      default:
        return 5 * 1024 * 1024 // 5MB
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = getMaxFileSize()
    if (file.size > maxSize) {
      toast.error(`Arquivo deve ter no máximo ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    setMediaFilename(file.name)
    setIsLoadingFile(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      let base64 = event.target?.result as string

      // WuzAPI exige application/octet-stream para documentos
      if (messageType === 'document') {
        // Troca qualquer mime type por application/octet-stream
        base64 = base64.replace(/^data:[^;]+;base64,/, 'data:application/octet-stream;base64,')
      }

      setMediaBase64(base64)

      // Preview for images and stickers
      if (messageType === 'image' || messageType === 'sticker') {
        setMediaPreview(base64)
      } else {
        setMediaPreview(null)
      }
      setIsLoadingFile(false)
    }
    reader.onerror = () => {
      toast.error('Erro ao carregar arquivo')
      setIsLoadingFile(false)
    }
    reader.readAsDataURL(file)
  }

  const clearMedia = () => {
    setMediaBase64(null)
    setMediaPreview(null)
    setMediaFilename('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if (!activeOrg?.id) {
      toast.error('Organização não encontrada')
      return
    }

    if (!phone.trim()) {
      toast.error('Informe o número de destino')
      return
    }

    setIsSending(true)
    try {
      const endpoint = `/api/v1/whatsapp/instances/${instance.instanceId}/test`

      const body: Record<string, unknown> = { phone, type: messageType }

      switch (messageType) {
        case 'text':
          body.message = textMessage
          break
        case 'image':
          body.image = mediaBase64
          if (mediaCaption) body.caption = mediaCaption
          break
        case 'audio':
          body.audio = mediaBase64
          break
        case 'video':
          body.video = mediaBase64
          if (mediaCaption) body.caption = mediaCaption
          break
        case 'document':
          body.document = mediaBase64
          if (mediaFilename) body.filename = mediaFilename
          if (mediaCaption) body.caption = mediaCaption
          break
        case 'sticker':
          body.sticker = mediaBase64
          break
        case 'location':
          body.latitude = parseFloat(latitude)
          body.longitude = parseFloat(longitude)
          if (locationName) body.name = locationName
          break
        case 'contact':
          body.contactName = contactName
          body.contactPhone = contactPhone
          break
        case 'poll':
          body.question = pollQuestion
          body.options = pollOptions.filter((o) => o.trim())
          break
        case 'buttons':
          body.title = buttonsTitle
          body.body = buttonsBody
          body.buttons = buttons
          break
        case 'list':
          body.topText = listTopText
          body.desc = listDesc
          body.buttonText = listButtonText
          body.list = listItems
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: activeOrg.id,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao enviar mensagem')
      }

      toast.success('Mensagem enviada!')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar')
    } finally {
      setIsSending(false)
    }
  }

  const isValid = () => {
    if (!phone.trim()) return false

    switch (messageType) {
      case 'text':
        return textMessage.trim().length > 0
      case 'image':
      case 'audio':
      case 'video':
      case 'document':
      case 'sticker':
        return !!mediaBase64
      case 'location':
        return !!latitude && !!longitude
      case 'contact':
        return !!contactName && !!contactPhone
      case 'poll':
        return !!pollQuestion && pollOptions.filter((o) => o.trim()).length >= 2
      case 'buttons':
        return !!buttonsTitle && !!buttonsBody && buttons.length > 0
      case 'list':
        return !!listTopText && !!listDesc && !!listButtonText && listItems.length > 0
      default:
        return false
    }
  }

  const renderMediaUpload = () => (
    <div className="space-y-2 w-full overflow-hidden">
      <Label>Arquivo</Label>
      {isLoadingFile ? (
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Loader2 className="h-6 w-6 mx-auto text-primary mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando arquivo...</p>
        </div>
      ) : mediaPreview && (messageType === 'image' || messageType === 'sticker') ? (
        <div className="relative">
          <img
            src={mediaPreview}
            alt="Preview"
            className="w-full h-32 object-cover rounded-lg border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={clearMedia}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : mediaBase64 ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="text-sm flex-1" title={mediaFilename}>
            {mediaFilename.length > 35
              ? `${mediaFilename.slice(0, 25)}...${mediaFilename.slice(-7)}`
              : mediaFilename}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearMedia}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Clique para selecionar</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedFileTypes()}
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  )

  const renderTypeForm = () => {
    switch (messageType) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              rows={3}
              placeholder="Digite sua mensagem..."
            />
          </div>
        )

      case 'image':
      case 'video':
        return (
          <>
            {renderMediaUpload()}
            <div className="space-y-2">
              <Label>Legenda (opcional)</Label>
              <Input
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Adicione uma legenda..."
              />
            </div>
          </>
        )

      case 'audio':
      case 'sticker':
        return renderMediaUpload()

      case 'document':
        return (
          <>
            {renderMediaUpload()}
            <div className="space-y-2">
              <Label>Legenda (opcional)</Label>
              <Input
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Descrição do documento..."
              />
            </div>
          </>
        )

      case 'location':
        const fetchLocationName = async (lat: number, lng: number) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`
            )
            const data = await res.json()
            if (data.address) {
              const { road, suburb, neighbourhood, city, town, village, state } = data.address
              const parts = [road, suburb || neighbourhood, city || town || village, state].filter(Boolean)
              setLocationName(parts.slice(0, 2).join(', ') || data.display_name?.split(',')[0] || '')
            }
          } catch {
            // Ignora erro de geocoding
          }
        }

        return (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (!navigator.geolocation) {
                  toast.error('Seu navegador não suporta geolocalização')
                  return
                }
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const lat = position.coords.latitude
                    const lng = position.coords.longitude
                    setLatitude(lat.toFixed(6))
                    setLongitude(lng.toFixed(6))
                    fetchLocationName(lat, lng)
                    toast.success('Localização obtida!')
                  },
                  () => {
                    toast.error('Não foi possível obter sua localização')
                  }
                )
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Usar minha localização
            </Button>
            <div className="space-y-2">
              <Label>Selecione no mapa</Label>
              <LocationPicker
                latitude={parseFloat(latitude) || -15.7942}
                longitude={parseFloat(longitude) || -47.8822}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat.toFixed(6))
                  setLongitude(lng.toFixed(6))
                  fetchLocationName(lat, lng)
                }}
              />
              <p className="text-xs text-muted-foreground">
                Clique no mapa ou arraste o marcador
              </p>
            </div>
            <div className="space-y-2">
              <Label>Nome do local</Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Buscando endereço..."
              />
            </div>
          </>
        )

      case 'contact':
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do contato</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone do contato</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(applyWhatsAppMask(e.target.value))}
                placeholder="(99) 99999-9999"
              />
            </div>
          </>
        )

      case 'poll':
        return (
          <>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Enquetes funcionam apenas em grupos!
            </p>
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Qual sua opção preferida?"
              />
            </div>
            <div className="space-y-2">
              <Label>Opções (mín. 2, máx. 12)</Label>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions]
                      newOpts[i] = e.target.value
                      setPollOptions(newOpts)
                    }}
                    placeholder={`Opção ${i + 1}`}
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 12 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar opção
                </Button>
              )}
            </div>
          </>
        )

      case 'buttons':
        return (
          <>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Botões podem não funcionar em algumas versões do WhatsApp
            </p>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={buttonsTitle}
                onChange={(e) => setButtonsTitle(e.target.value)}
                placeholder="Título da mensagem"
              />
            </div>
            <div className="space-y-2">
              <Label>Corpo</Label>
              <Textarea
                value={buttonsBody}
                onChange={(e) => setButtonsBody(e.target.value)}
                rows={2}
                placeholder="Texto da mensagem"
              />
            </div>
            <div className="space-y-2">
              <Label>Botões (máx. 3)</Label>
              {buttons.map((btn, i) => (
                <div key={i} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      value={btn.text}
                      onChange={(e) => {
                        const newBtns = [...buttons]
                        newBtns[i] = { ...btn, text: e.target.value }
                        setButtons(newBtns)
                      }}
                      placeholder="Texto do botão"
                      className="flex-1"
                    />
                    <Select
                      value={btn.type}
                      onValueChange={(v) => {
                        const newBtns = [...buttons]
                        newBtns[i] = { ...btn, type: v as ButtonType, url: undefined, phoneNumber: undefined }
                        setButtons(newBtns)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quickreply">Resposta</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="call">Ligar</SelectItem>
                      </SelectContent>
                    </Select>
                    {buttons.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {btn.type === 'url' && (
                    <Input
                      value={btn.url || ''}
                      onChange={(e) => {
                        const newBtns = [...buttons]
                        newBtns[i] = { ...btn, url: e.target.value }
                        setButtons(newBtns)
                      }}
                      placeholder="https://exemplo.com"
                    />
                  )}
                  {btn.type === 'call' && (
                    <Input
                      value={btn.phoneNumber || ''}
                      onChange={(e) => {
                        const newBtns = [...buttons]
                        newBtns[i] = { ...btn, phoneNumber: e.target.value }
                        setButtons(newBtns)
                      }}
                      placeholder="5561999999999"
                    />
                  )}
                </div>
              ))}
              {buttons.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setButtons([...buttons, { text: '', type: 'quickreply' }])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar botão
                </Button>
              )}
            </div>
          </>
        )

      case 'list':
        return (
          <>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Listas podem não funcionar em algumas versões do WhatsApp
            </p>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={listTopText}
                onChange={(e) => setListTopText(e.target.value)}
                placeholder="Título"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={listDesc}
                onChange={(e) => setListDesc(e.target.value)}
                placeholder="Descrição"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do botão</Label>
              <Input
                value={listButtonText}
                onChange={(e) => setListButtonText(e.target.value)}
                placeholder="Ver opções"
              />
            </div>
            <div className="space-y-2">
              <Label>Itens da lista</Label>
              {listItems.map((item, i) => (
                <div key={item.rowId} className="flex gap-2">
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const newItems = [...listItems]
                      newItems[i] = { ...item, title: e.target.value }
                      setListItems(newItems)
                    }}
                    placeholder={`Item ${i + 1}`}
                    className="flex-1"
                  />
                  {listItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setListItems(listItems.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setListItems([...listItems, { rowId: String(listItems.length + 1), title: '', desc: '' }])
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar item
              </Button>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Envio de Mensagem</DialogTitle>
          <DialogDescription>Instância: {instanceLabel}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4 w-full">
          <div className="space-y-4 py-2 overflow-hidden">
            <div className="space-y-2">
              <Label>Número de destino</Label>
              <Input
                placeholder="(99) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(applyWhatsAppMask(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                {messageType === 'poll' ? 'ID do grupo (ex: 120363...@g.us)' : 'DDD + número'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tipo de mensagem</Label>
              <Select
                value={messageType}
                onValueChange={(v) => {
                  setMessageType(v as MessageType)
                  clearMedia()
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderTypeForm()}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending || isLoadingFile || !isValid()}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
