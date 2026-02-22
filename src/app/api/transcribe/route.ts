import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file was provided' },
        { status: 400 }
      )
    }

    const MAX_SIZE = 300 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `The file exceeds the maximum size of 300 MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)} MB` },
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
        { error: `Unsupported file format: ${file.type || 'unknown'}. Supported formats: MP4, WebM, OGG, MOV, MP3, WAV, M4A, AVI, MKV` },
        { status: 400 }
      )
    }

    console.log(`[Transcribe] Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in the environment variables' },
        { status: 500 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Audio = buffer.toString('base64')

    console.log(`[Transcribe] File converted to base64, length: ${base64Audio.length} chars`)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash'
    })

    const mimeType = file.type || 'audio/mpeg'

    const prompt = 'Accurately transcribe the following audio. Return only the transcribed text.'

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Audio
              }
            }
          ]
        }
      ]
    })

    const text = result.response.text()

    const processingTime = Date.now() - startTime

    console.log(`[Transcribe] Transcription completed in ${processingTime}ms`)

    const wordCount = text ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0

    return NextResponse.json({
      success: true,
      text: text || '',
      wordCount,
      processingTime,
      fileName: file.name,
      fileSize: file.size
    })

  } catch (error) {
    console.error('[Transcribe] Error:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error while processing the file'
    
    return NextResponse.json(
      { error: `Transcription error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
