'use client'

import { useSearchParams } from 'next/navigation'
import { ChatArea } from '@/components/ChatArea'
import { MessageCircle, Users } from 'lucide-react'

export default function Dashboard() {
  const searchParams = useSearchParams()
  const chatId = searchParams.get('chat')
  const chatType = searchParams.get('type') as 'friend' | 'group' | null

  if (!chatId || !chatType) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <MessageCircle className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome to ChatFlow
          </h2>
          <p className="text-gray-600 mb-6 max-w-md">
            Select a friend or group from the sidebar to start chatting. 
            Real-time messaging with intelligent polls and collaboration features.
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Add Friends</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Join Groups</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <ChatArea chatId={chatId} chatType={chatType} />
}