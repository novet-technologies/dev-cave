import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ users: [] })
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', session.user.id)
      .limit(20)

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Check existing friend requests and friendships
    const { data: existingRequests } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)

    const { data: existingFriends } = await supabase
      .from('friends')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)

    const usersWithStatus = users?.map(user => {
      const existingRequest = existingRequests?.find(req => 
        (req.sender_id === session.user.id && req.receiver_id === user.id) ||
        (req.receiver_id === session.user.id && req.sender_id === user.id)
      )

      const existingFriend = existingFriends?.find(friend =>
        (friend.user1_id === session.user.id && friend.user2_id === user.id) ||
        (friend.user2_id === session.user.id && friend.user1_id === user.id)
      )

      let relationshipStatus = 'none'
      if (existingFriend) {
        relationshipStatus = 'friends'
      } else if (existingRequest) {
        if (existingRequest.sender_id === session.user.id) {
          relationshipStatus = 'request_sent'
        } else {
          relationshipStatus = 'request_received'
        }
      }

      return {
        ...user,
        relationshipStatus
      }
    }) || []

    return NextResponse.json({ users: usersWithStatus })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}