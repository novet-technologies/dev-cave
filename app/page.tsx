'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  MessageCircle, 
  Users, 
  BarChart3, 
  Zap, 
  Shield, 
  Globe,
  ArrowRight,
  Check
} from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ChatFlow</span>
          </div>
          <Link href="/auth/signin">
            <Button variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Real-time Messaging
            <span className="block text-blue-600">with Intelligent Polls</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with friends through instant messaging, create collaborative groups, 
            and participate in AI-powered polls that provide meaningful insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth/signin">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>

          {/* Feature Preview */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Real-time Chat</h3>
                <p className="text-sm text-gray-600">
                  Instant messaging with friends and groups using Socket.IO
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Friend System</h3>
                <p className="text-sm text-gray-600">
                  Send requests, manage friendships, and discover new connections
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Smart Polls</h3>
                <p className="text-sm text-gray-600">
                  AI-powered polls with automated insights and summaries
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Everything you need for modern communication
              </h2>
              <p className="text-xl text-gray-600">
                Built with the latest technologies for a seamless experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-6">
                <Zap className="h-10 w-10 text-yellow-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-gray-600">
                  Real-time updates powered by Socket.IO for instant communication
                </p>
              </div>

              <div className="p-6">
                <Shield className="h-10 w-10 text-green-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Secure & Private</h3>
                <p className="text-gray-600">
                  Enterprise-grade security with NextAuth and Supabase authentication
                </p>
              </div>

              <div className="p-6">
                <Globe className="h-10 w-10 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">AI-Powered</h3>
                <p className="text-gray-600">
                  Intelligent poll analysis and insights using OpenAI technology
                </p>
              </div>

              <div className="p-6">
                <MessageCircle className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Group Collaboration</h3>
                <p className="text-gray-600">
                  Create groups, manage members, and collaborate effectively
                </p>
              </div>

              <div className="p-6">
                <Users className="h-10 w-10 text-indigo-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Friend Management</h3>
                <p className="text-gray-600">
                  Easy friend discovery, requests, and relationship management
                </p>
              </div>

              <div className="p-6">
                <BarChart3 className="h-10 w-10 text-red-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Smart Polls</h3>
                <p className="text-gray-600">
                  Webhook-triggered polls with AI-generated insights and summaries
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of users already using ChatFlow for better communication
            </p>
            <Link href="/auth/signin">
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                Create Your Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ChatFlow</span>
          </div>
          <p className="text-center text-gray-400">
            Built with Next.js, TypeScript, Supabase, and Socket.IO
          </p>
        </div>
      </footer>
    </div>
  )
}