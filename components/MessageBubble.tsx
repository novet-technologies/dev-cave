'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: {
    id: string
    content: string
    created_at: string
    sender: {
      id: string
      username: string
      display_name: string
      avatar_url?: string
    }
  }
  isOwn: boolean
  showAvatar?: boolean
}

export function MessageBubble({ message, isOwn, showAvatar = false }: MessageBubbleProps) {
  return (
    <div className={cn(
      'flex items-start space-x-3',
      isOwn ? 'flex-row-reverse space-x-reverse' : ''
    )}>
      {showAvatar && !isOwn && (
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {message.sender.display_name[0].toUpperCase()}
        </div>
      )}
      
      <div className={cn(
        'max-w-xs lg:max-w-md',
        isOwn ? 'mr-auto' : 'ml-auto'
      )}>
        {showAvatar && !isOwn && (
          <p className="text-xs text-gray-500 mb-1 px-1">
            {message.sender.display_name}
          </p>
        )}
        
        <div className={cn(
          'px-4 py-2 rounded-lg shadow-sm',
          isOwn 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        )}>
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        
        <p className={cn(
          'text-xs text-gray-500 mt-1 px-1',
          isOwn ? 'text-right' : 'text-left'
        )}>
          {format(new Date(message.created_at), 'h:mm a')}
        </p>
      </div>
    </div>
  )
}