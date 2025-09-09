'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Search, UserPlus, Check, Clock, X } from 'lucide-react'

interface User {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  status: 'online' | 'offline' | 'away'
  relationshipStatus: 'none' | 'friends' | 'request_sent' | 'request_received'
}

export default function SearchFriends() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query.trim())}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setSearchPerformed(true)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId })
      })

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, relationshipStatus: 'request_sent' }
            : user
        ))
      }
    } catch (error) {
      console.error('Failed to send friend request:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'friends':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Friends</Badge>
      case 'request_sent':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Pending</Badge>
      case 'request_received':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Respond</Badge>
      default:
        return null
    }
  }

  const getActionButton = (user: User) => {
    switch (user.relationshipStatus) {
      case 'friends':
        return (
          <Button variant="secondary" size="sm" disabled>
            <Check className="h-4 w-4 mr-1" />
            Friends
          </Button>
        )
      case 'request_sent':
        return (
          <Button variant="outline" size="sm" disabled>
            <Clock className="h-4 w-4 mr-1" />
            Sent
          </Button>
        )
      case 'request_received':
        return (
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
            Respond
          </Button>
        )
      default:
        return (
          <Button 
            size="sm"
            onClick={() => sendFriendRequest(user.id)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Friend
          </Button>
        )
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Find Friends</h1>
        </div>
        
        <form onSubmit={handleSearch} className="flex space-x-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or display name..."
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {user.display_name[0].toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      user.status === 'online' ? 'bg-green-500' :
                      user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {user.display_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      @{user.username}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getStatusBadge(user.relationshipStatus)}
                  {getActionButton(user)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {searchPerformed && users.length === 0 && !loading && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">
              Try searching with different keywords or check the spelling
            </p>
          </div>
        )}
        
        {!searchPerformed && !loading && (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Find New Friends</h3>
            <p className="text-gray-500">
              Search for users by their username or display name to send friend requests
            </p>
          </div>
        )}
      </div>
    </div>
  )
}