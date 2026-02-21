'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileVideo, 
  Loader2, 
  Copy, 
  Download, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  Mic
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TranscriptionResult {
  text: string
  wordCount: number
  duration: number
  fileName: string
  fileSize: number
}

export default function Home() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB
  const ACCEPTED_TYPES = [
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp3',
    'audio/x-wav', 'audio/webm'
  ]

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `El archivo excede el tamaño máximo de ${formatFileSize(MAX_FILE_SIZE)}`
    }
    
    const isValidType = ACCEPTED_TYPES.includes(file.type) || 
      file.name.match(/\.(mp4|webm|ogg|mov|mp3|wav|m4a)$/i)
    
    if (!isValidType) {
      return 'Formato de archivo no soportado. Use: MP4, WebM, OGG, MOV, MP3, WAV, M4A'
    }
    
    return null
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const validationError = validateFile(droppedFile)
      if (validationError) {
        setError(validationError)
        toast({
          title: 'Error',
          description: validationError,
          variant: 'destructive'
        })
        return
      }
      setFile(droppedFile)
      setError(null)
      setTranscription(null)
    }
  }, [toast])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validationError = validateFile(selectedFile)
      if (validationError) {
        setError(validationError)
        toast({
          title: 'Error',
          description: validationError,
          variant: 'destructive'
        })
        return
      }
      setFile(selectedFile)
      setError(null)
      setTranscription(null)
    }
  }

  const handleTranscribe = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al transcribir el archivo')
      }

      setTranscription({
        text: result.text,
        wordCount: result.wordCount,
        duration: result.processingTime,
        fileName: file.name,
        fileSize: file.size
      })

      toast({
        title: '¡Transcripción completada!',
        description: `Se procesaron ${result.wordCount} palabras`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast({
        title: 'Error en la transcripción',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  const handleCopy = async () => {
    if (!transcription?.text) return
    
    await navigator.clipboard.writeText(transcription.text)
    setCopied(true)
    toast({
      title: 'Copiado',
      description: 'La transcripción se ha copiado al portapapeles',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!transcription?.text) return
    
    const blob = new Blob([transcription.text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file?.name.split('.')[0] || 'transcripcion'}_transcripcion.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Descargado',
      description: 'El archivo se ha descargado correctamente',
    })
  }

  const handleReset = () => {
    setFile(null)
    setTranscription(null)
    setError(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
            <Mic className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Video Transcriber</h1>
            <p className="text-sm text-muted-foreground">Transcribe videos y audios con IA</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Upload Section */}
          <Card className="border-2 border-dashed transition-colors hover:border-primary/50">
            <CardContent className="p-0">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative p-8 text-center transition-all ${
                  isDragging 
                    ? 'bg-primary/5 border-primary' 
                    : file 
                      ? 'bg-muted/30' 
                      : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*,.mp4,.webm,.ogg,.mov,.mp3,.wav,.m4a"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                      <FileVideo className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTranscribe()
                        }}
                        disabled={isUploading}
                        className="gap-2"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Transcribiendo...
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            Transcribir
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReset()
                        }}
                        disabled={isUploading}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Limpiar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-full transition-colors ${
                      isDragging ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Upload className={`w-8 h-8 transition-colors ${
                        isDragging ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-lg">
                        {isDragging ? 'Suelta el archivo aquí' : 'Arrastra y suelta tu video o audio'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        o haz clic para seleccionar un archivo
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary">MP4</Badge>
                      <Badge variant="secondary">WebM</Badge>
                      <Badge variant="secondary">MOV</Badge>
                      <Badge variant="secondary">MP3</Badge>
                      <Badge variant="secondary">WAV</Badge>
                      <Badge variant="secondary">M4A</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tamaño máximo: 500 MB
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          {isUploading && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Procesando archivo...</p>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transcription Result */}
          {transcription && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Transcripción
                    </CardTitle>
                    <CardDescription>
                      {transcription.wordCount} palabras • Procesado en {(transcription.duration / 1000).toFixed(1)}s
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={transcription.text}
                  readOnly
                  className="min-h-[300px] resize-y font-mono text-sm"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>Transcribe tus videos y audios de hasta 500 MB con inteligencia artificial</p>
        </div>
      </footer>
    </div>
  )
}
