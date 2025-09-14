'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
console.log(error)
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'access_denied':
        return 'Access was denied. You may have cancelled the authentication process.'
      case 'server_error':
        return `A server error occurred during authentication. Please try again. 
        Use any other Oauth method. Dont worry, we've got plenty.
        `
      case 'temporarily_unavailable':
        return 'The authentication service is temporarily unavailable. Please try again later.'
      case 'invalid_request':
        return 'The authentication request was invalid. Please try again.'
      default:
        return 'An unexpected error occurred during authentication.'
    }
  }

  const getErrorTitle = (error: string | null) => {
    switch (error) {
      case 'access_denied':
        return 'Authentication Cancelled'
      case 'server_error':
        return 'Server Error'
      case 'temporarily_unavailable':
        return 'Service Unavailable'
      case 'invalid_request':
        return 'Invalid Request'
      default:
        return 'Authentication Error'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {getErrorTitle(error)}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {getErrorMessage(error)}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {errorDescription && (
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Details:</strong> {errorDescription}
              </p>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If this problem persists, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
