import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-16">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-pink-primary mb-4">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-text mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
          </p>
        </div>

        <div className="card-white p-8 mb-8">
          <div className="flex items-center justify-center mb-6">
            <Search className="h-16 w-16 text-pink-primary" />
          </div>
          <p className="text-muted-text mb-6">
            Let's get you back on track. Here are some helpful links:
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              className="btn-pink-primary"
            >
              <Link href="/" className="flex items-center justify-center">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <Button 
              asChild
              variant="outline"
              className="border-2 border-border hover:border-pink-primary hover:text-pink-primary"
            >
              <Link href="/menu">
                View Menu
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <Link 
            href="/menu" 
            className="card-white p-4 rounded-lg hover:border-pink-primary transition-all text-center"
          >
            <div className="font-semibold text-dark mb-1">Menu</div>
            <div className="text-muted-text text-xs">Browse our dishes</div>
          </Link>
          <Link 
            href="/order-status" 
            className="card-white p-4 rounded-lg hover:border-pink-primary transition-all text-center"
          >
            <div className="font-semibold text-dark mb-1">Track Order</div>
            <div className="text-muted-text text-xs">Check order status</div>
          </Link>
          <Link 
            href="/location" 
            className="card-white p-4 rounded-lg hover:border-pink-primary transition-all text-center"
          >
            <div className="font-semibold text-dark mb-1">Locations</div>
            <div className="text-muted-text text-xs">Find us near you</div>
          </Link>
        </div>
      </div>
    </div>
  )
}