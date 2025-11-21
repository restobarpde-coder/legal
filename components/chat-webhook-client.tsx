'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  sender: 'user' | 'bot'
  text: string
}

const WEBHOOK_URL = '/api/chat-proxy'

export function ChatWebhookClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return

    const userMessage: Message = { sender: 'user', text: inputMessage }
    setMessages((prevMessages) => [...prevMessages, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputMessage }),
      })

      if (!response.ok) {
        throw new Error(`Proxy responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      // Assuming the proxy returns { response: <webhook_response> }
      // And webhook_response is either plain text or { text: "..." }
      let botResponseText: string
      if (typeof data.response === 'string') {
        botResponseText = data.response
      } else if (typeof data.response === 'object' && data.response !== null && 'text' in data.response) {
        botResponseText = data.response.text
      } else {
        botResponseText = JSON.stringify(data.response)
      }
      
      const botMessage: Message = { sender: 'bot', text: botResponseText || 'No response from webhook' }
      setMessages((prevMessages) => [...prevMessages, botMessage])
    } catch (error) {
      console.error('Error sending message via proxy:', error)
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', text: `Error: ${error instanceof Error ? error.message : String(error)}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage()
    }
  }

  return (
    <Card className="flex flex-col h-[70vh]">
      <CardContent className="flex-1 p-4 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 text-sm ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[70%] rounded-lg p-3 text-sm bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  Escribiendo...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex p-4 border-t">
        <Input
          type="text"
          placeholder="Escribe tu mensaje..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 mr-2"
          disabled={isLoading}
        />
        <Button onClick={handleSendMessage} disabled={isLoading}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Enviar</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
