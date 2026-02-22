'use client'

import {useCallback, useRef, useState, useTransition} from 'react'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Progress} from '@/components/ui/progress'
import {Textarea} from '@/components/ui/textarea'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileVideo,
  Loader2,
  Mic,
  Trash2,
  Upload,
} from 'lucide-react'
import {useToast} from '@/hooks/use-toast'
import {useLocale, useTranslations} from 'next-intl'
import {useRouter} from 'next/navigation'
import {setLocale} from '@/app/actions/setLocale'

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
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {toast} = useToast()
  const t = useTranslations('Home')
  const locale = useLocale()
  const router = useRouter()

  const MAX_FILE_SIZE = 300 * 1024 * 1024
  const ACCEPTED_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/mp3',
    'audio/x-wav',
    'audio/webm',
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
      return t('errorFileTooBig', {maxSize: formatFileSize(MAX_FILE_SIZE)})
    }

    const isValidType =
      ACCEPTED_TYPES.includes(file.type) || file.name.match(/\.(mp4|webm|ogg|mov|mp3|wav|m4a)$/i)

    if (!isValidType) {
      return t('errorUnsupportedFormat')
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
        throw new Error(result.error || t('errorGenericTranscribe'))
      }

      setTranscription({
        text: result.text,
        wordCount: result.wordCount,
        duration: result.processingTime,
        fileName: file.name,
        fileSize: file.size
      })

      toast({
        title: t('toastSuccessTitle'),
        description: t('toastSuccessDescription', {count: result.wordCount}),
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toastUnknownError')
      setError(errorMessage)
      toast({
        title: t('toastErrorTitle'),
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
      title: t('toastCopiedTitle'),
      description: t('toastCopiedDescription'),
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!transcription?.text) return
    
    const blob = new Blob([transcription.text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file?.name.split('.')[0] || 'transcription'}_transcription.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: t('toastDownloadedTitle'),
      description: t('toastDownloadedDescription'),
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
              <Mic className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Video Transcriber</h1>
              <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={locale === 'en' ? 'default' : 'outline'}
              size="sm"
              disabled={isPending || locale === 'en'}
              onClick={() => {
                startTransition(async () => {
                  await setLocale('en')
                  router.refresh()
                })
              }}
            >
              EN
            </Button>
            <Button
              variant={locale === 'es' ? 'default' : 'outline'}
              size="sm"
              disabled={isPending || locale === 'es'}
              onClick={() => {
                startTransition(async () => {
                  await setLocale('es')
                  router.refresh()
                })
              }}
            >
              ES
            </Button>
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
                {!file && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,audio/*,.mp4,.webm,.ogg,.mov,.mp3,.wav,.m4a"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                )}

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
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            Transcribe
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
                        Clear
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
                        {isDragging ? t('uploadDropActive') : t('uploadDropInactive')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('uploadClickHint')}
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
                      {t('maxSize', {size: '300 MB'})}
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
                    <p className="text-sm font-medium mb-2">{t('processingLabel')}</p>
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
                      {t('resultTitle')}
                    </CardTitle>
                    <CardDescription>
                      {t('resultDescription', {
                        count: transcription.wordCount,
                        seconds: (transcription.duration / 1000).toFixed(1),
                      })}
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
                          {t('buttonCopied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {t('buttonCopy')}
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
                      {t('buttonDownload')}
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
          <p>{t('footer')}</p>
        </div>
      </footer>
    </div>
  )
}
