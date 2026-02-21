import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// Configure max file size (500 MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
    responseLimit: false,
  },
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo' },
        { status: 400 }
      )
    }

    // Validate file size (500 MB max)
    const MAX_SIZE = 500 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de 500 MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)} MB` },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = [
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp3',
      'audio/x-wav', 'audio/webm', 'audio/mp4', 'video/x-msvideo',
      'video/x-matroska'
    ]
    
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.mp3', '.wav', '.m4a', '.avi', '.mkv', '.flac']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json(
        { error: `Formato de archivo no soportado: ${file.type || 'desconocido'}. Formatos soportados: MP4, WebM, OGG, MOV, MP3, WAV, M4A, AVI, MKV` },
        { status: 400 }
      )
    }

    console.log(`[Transcribe] Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Audio = buffer.toString('base64')

    console.log(`[Transcribe] File converted to base64, length: ${base64Audio.length} chars`)

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    console.log('[Transcribe] Sending to ASR service...')

    // Call ASR service
    const response = await zai.audio.asr.create({
      file_base64: base64Audio
    })

    const processingTime = Date.now() - startTime

    console.log(`[Transcribe] Transcription completed in ${processingTime}ms`)

    // Calculate word count
    const wordCount = response.text ? response.text.trim().split(/\s+/).filter(w => w.length > 0).length : 0

    return NextResponse.json({
      success: true,
      text: response.text || '',
      wordCount,
      processingTime,
      fileName: file.name,
      fileSize: file.size
    })

  } catch (error) {
    console.error('[Transcribe] Error:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido al procesar el archivo'
    
    return NextResponse.json(
      { error: `Error en la transcripción: ${errorMessage}` },
      { status: 500 }
    )
  }
}
