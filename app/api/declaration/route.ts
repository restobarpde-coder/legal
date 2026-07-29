import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const DECLARATION_PROMPT = `Eres un redactor profesional de declaraciones verbales. Recibirás un texto que representa lo que una persona dijo oralmente. Ese texto puede contener errores de ortografía, repeticiones, incoherencias, frases incompletas o expresiones informales.

Tu tarea es:
1. Interpretar con fidelidad lo que la persona quiso decir.
2. Corregir y reorganizar el contenido para producir una declaración escrita clara, formal y coherente.
3. No agregar información que no esté en el mensaje original.
4. No explicar tu proceso ni añadir notas.
5. No incluir advertencias, aclaraciones ni texto introductorio.

Entrega únicamente la declaración final redactada, como si fuera un documento formal listo para presentar. La salida debe ser solo la declaración, en formato claro y profesional, comenzando directamente por el contenido (ej.: "Yo, [nombre], declaro que…").

El texto recibido es:`

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth()

    // Get the audio file from the form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Verify OpenAI key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('Processing audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    })

    // Convert the audio file to a buffer for Whisper
    const audioBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(audioBuffer)

    // Transcribe audio using Whisper
    console.log('Transcribing audio with Whisper...')
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], audioFile.name, { type: audioFile.type }),
      model: 'whisper-1',
      language: 'es',
    })

    const transcribedText = transcription.text
    console.log('Transcription:', transcribedText)

    // Process the transcription to generate a formal declaration using GPT
    console.log('Processing transcription with GPT...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: DECLARATION_PROMPT,
        },
        {
          role: 'user',
          content: transcribedText,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const summary = completion.choices[0].message.content || ''
    console.log('Generated declaration:', summary)

    // Return the summary and transcription to the frontend
    return NextResponse.json({
      summary,
      transcription: transcribedText,
    })

  } catch (error) {
    console.error('Error in declaration API:', error)

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
