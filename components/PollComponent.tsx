'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BarChart3, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Poll {
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

interface PollComponentProps {
  poll: Poll
  isGroupAdmin: boolean
  onRespond: (pollId: string, optionId: string) => void
  onGetResults: (pollId: string) => void
  currentUserId: string
}

export function PollComponent({ 
  poll, 
  isGroupAdmin, 
  onRespond, 
  onGetResults, 
  currentUserId 
}: PollComponentProps) {
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [hasResponded, setHasResponded] = useState(false)
  
  // Check if current user has already responded
  const userResponse = poll.responses.find(r => r.user.id === currentUserId)
  const isCompleted = poll.status === 'completed'
  
  // Calculate vote counts
  const voteCounts = poll.options.reduce((counts, option) => {
    counts[option.id] = poll.responses.filter(r => r.option.id === option.id).length
    return counts
  }, {} as Record<string, number>)
  
  const totalVotes = poll.responses.length
  const sortedOptions = [...poll.options].sort((a, b) => a.option_order - b.option_order)

  const handleVote = () => {
    if (!selectedOption || hasResponded || userResponse) return
    
    onRespond(poll.id, selectedOption)
    setHasResponded(true)
  }

  const canShowResults = isCompleted || userResponse || hasResponded
  const maxVotes = Math.max(...Object.values(voteCounts), 1)

  return (
    <Card className="w-full max-w-md mx-auto border-l-4 border-l-blue-600">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <Badge variant={isCompleted ? 'secondary' : 'default'}>
              {isCompleted ? 'Completed' : 'Active Poll'}
            </Badge>
          </div>
          {userResponse && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
        </div>
        <CardTitle className="text-base font-medium">
          {poll.question}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Poll Options */}
        <div className="space-y-3">
          {sortedOptions.map((option) => {
            const voteCount = voteCounts[option.id] || 0
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
            const isSelected = selectedOption === option.id
            const isUserChoice = userResponse?.option.id === option.id

            return (
              <div key={option.id} className="space-y-2">
                <button
                  onClick={() => {
                    if (!userResponse && !hasResponded && !isCompleted) {
                      setSelectedOption(option.id)
                    }
                  }}
                  disabled={userResponse || hasResponded || isCompleted}
                  className={cn(
                    'w-full p-3 text-left border rounded-lg transition-all',
                    isSelected && !canShowResults && 'border-blue-600 bg-blue-50',
                    isUserChoice && 'border-green-600 bg-green-50',
                    userResponse || hasResponded || isCompleted 
                      ? 'cursor-not-allowed' 
                      : 'cursor-pointer hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {String.fromCharCode(65 + option.option_order)}) {option.option_text}
                    </span>
                    {isUserChoice && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </button>

                {/* Show results if poll is completed or user has responded */}
                {canShowResults && (
                  <div className="px-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{voteCount} votes</span>
                      <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                    {voteCount > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {poll.responses
                          .filter(r => r.option.id === option.id)
                          .slice(0, 3)
                          .map(r => (
                            <span
                              key={r.id}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                            >
                              {r.user.display_name}
                            </span>
                          ))
                        }
                        {poll.responses.filter(r => r.option.id === option.id).length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            +{poll.responses.filter(r => r.option.id === option.id).length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Vote Button */}
        {!userResponse && !hasResponded && !isCompleted && (
          <Button
            onClick={handleVote}
            disabled={!selectedOption}
            className="w-full"
          >
            Cast Vote
          </Button>
        )}

        {/* Get Results Button (Admin only) */}
        {!isCompleted && isGroupAdmin && (
          <Button
            onClick={() => onGetResults(poll.id)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Get Results
          </Button>
        )}

        {/* Results Summary */}
        {poll.results_summary && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center">
              <BarChart3 className="h-4 w-4 mr-1" />
              AI Insights
            </h4>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">
              {poll.results_summary}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <span className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {totalVotes} responses
          </span>
          <span>
            {isCompleted ? 'Poll closed' : 'Poll active'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}