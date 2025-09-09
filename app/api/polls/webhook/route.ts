import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Mock bot user ID - in production, create a proper bot account
const BOT_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  try {
    // Parse email content from webhook (Gmail mock)
    const body = await request.json()
    
    // Mock email parsing - in production, parse actual email
    const emailContent = body.content || 'What is your favorite programming language? A) JavaScript B) Python C) TypeScript D) Go'
    
    const groupId = body.groupId // This would come from email metadata or configuration
    
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID required' }, { status: 400 })
    }

    // Parse poll from email content (simple regex for demo)
    const pollMatch = emailContent.match(/(.+\?)\s*(.*)/s)
    if (!pollMatch) {
      return NextResponse.json({ error: 'Could not parse poll from email' }, { status: 400 })
    }

    const question = pollMatch[1].trim()
    const optionsText = pollMatch[2].trim()
    
    // Extract options (A) Option 1 B) Option 2 format
    const options = []
    const optionMatches = optionsText.match(/[A-Z]\)\s*([^A-Z\)]+)/g)
    
    if (!optionMatches || optionMatches.length < 2) {
      return NextResponse.json({ error: 'Could not parse poll options' }, { status: 400 })
    }

    optionMatches.forEach((match, index) => {
      const option = match.replace(/^[A-Z]\)\s*/, '').trim()
      options.push({ text: option, order: index })
    })

    // Create bot message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: BOT_USER_ID,
        content: `📊 New Poll: ${question}`,
        message_type: 'poll',
        group_id: groupId
      })
      .select('*')
      .single()

    if (messageError) {
      console.error('Message creation error:', messageError)
      return NextResponse.json({ error: 'Failed to create poll message' }, { status: 500 })
    }

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        message_id: message.id,
        question,
        group_id: groupId,
        created_by: BOT_USER_ID,
        status: 'active'
      })
      .select('*')
      .single()

    if (pollError) {
      console.error('Poll creation error:', pollError)
      return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
    }

    // Create poll options
    const optionInserts = options.map(option => ({
      poll_id: poll.id,
      option_text: option.text,
      option_order: option.order
    }))

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionInserts)

    if (optionsError) {
      console.error('Options creation error:', optionsError)
      return NextResponse.json({ error: 'Failed to create poll options' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      poll: { 
        ...poll, 
        message,
        options: optionInserts 
      } 
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}