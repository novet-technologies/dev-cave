'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/components/SocketProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MessageBubble } from '@/components/MessageBubble'
import { PollComponent } from '@/components/PollComponent'
import { Send, BarChart3, Users, Settings } from 'lucide-react'

interface Message {
  id: string
  content: string
  message_type: 'text' | 'poll' | 'system'
  created_at: string
  sender: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
  poll?: {
    id: string
    question: string
    status: 'active' | 'completed'
    results_summary?: string
    options: Array<{
      id: string
      option_text: string
      option_order: number
    }>
    responses: Array<{
      id: string
      user: {
        id: string
        username: string
        display_name: string
      }
      option: {
        id: string
        option_text: string
      }
    }>
  }
}

interface ChatAreaProps {
  chatId: string
  chatType: 'friend' | 'group'
}

export function ChatArea({ chatId, chatType }: ChatAreaProps) {
  const { data: session } = useSession()
  const { socket } = useSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [chatInfo, setChatInfo] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages and chat info
  useEffect(() => {
    loadMessages()
    loadChatInfo()
  }, [chatId, chatType])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on('message:new', (message) => {
      if (
        (chatType === 'group' && message.group_id === chatId) ||
        (chatType === 'friend' && 
         ((message.sender_id === chatId && message.receiver_id === session?.user?.id) ||
          (message.sender_id === session?.user?.id && message.receiver_id === chatId)))
      ) {
        setMessages(prev => [...prev, message])
      }
    })

    socket.on('poll:new', (poll) => {
      if (poll.group_id === chatId) {
        loadMessages() // Reload to get the full poll data
      }
    })

    socket.on('poll:response', () => {
      loadMessages() // Reload to get updated responses
    })

    return () => {
      socket.off('message:new')
      socket.off('poll:new')
      socket.off('poll:response')
    }
  }, [socket, chatId, chatType, session?.user?.id])

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      })
      
      if (chatType === 'group') {
        params.append('groupId', chatId)
      } else {
        params.append('receiverId', chatId)
      }

      const response = await fetch(`/api/messages?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChatInfo = async () => {
    try {
      if (chatType === 'group') {
        const response = await fetch('/api/groups')
        if (response.ok) {
          const data = await response.json()
          const group = data.groups.find((g: any) => g.id === chatId)
          setChatInfo(group)
        }
      } else {
        const response = await fetch('/api/friends')
        if (response.ok) {
          const data = await response.json()
          const friendship = data.friends.find((f: any) => f.friend.id === chatId)
          setChatInfo(friendship?.friend)
        }
      }
    } catch (error) {
      console.error('Failed to load chat info:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return
    
    setSending(true)
    
    try {
      const payload = {
        content: newMessage.trim(),
        ...(chatType === 'group' ? { groupId: chatId } : { receiverId: chatId })
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setNewMessage('')
        // Message will be added via socket event
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handlePollResponse = async (pollId: string, optionId: string) => {
    try {
      const response = await fetch(`/api/polls/${pollId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId })
      })

      if (response.ok && socket) {
        socket.emit('poll:respond', { pollId, optionId })
      }
    } catch (error) {
      console.error('Failed to respond to poll:', error)
    }
  }

  const handleGetResults = async (pollId: string) => {
    try {
      const response = await fetch(`/api/polls/${pollId}/results`, {
        method: 'POST'
      })

      if (response.ok) {
        loadMessages() // Reload to get updated results
      }
    } catch (error) {
      console.error('Failed to get poll results:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              {chatInfo?.name?.[0]?.toUpperCase() || chatInfo?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {chatInfo?.name || chatInfo?.display_name || 'Loading...'}
              </h2>
              <p className="text-sm text-gray-500">
                {chatType === 'group' 
                  ? `${chatInfo?.members?.length || 0} members`
                  : `@${chatInfo?.username || 'loading'}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {chatType === 'group' && (
              <>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Group
                </Badge>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.message_type === 'poll' && message.poll ? (
                <PollComponent
                  poll={message.poll}
                  isGroupAdmin={chatType === 'group' && chatInfo?.admin_id === session?.user?.id}
                  onRespond={handlePollResponse}
                  onGetResults={handleGetResults}
                  currentUserId={session?.user?.id || ''}
                />
              ) : (
                <MessageBubble
                  message={message}
                  isOwn={message.sender.id === session?.user?.id}
                  showAvatar={chatType === 'group'}
                />
              )}
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-6 border-t border-gray-200">
        <form onSubmit={sendMessage} className="flex items-center space-x-4">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${chatInfo?.name || chatInfo?.display_name || ''}...`}
            className="flex-1"
            disabled={sending}
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}