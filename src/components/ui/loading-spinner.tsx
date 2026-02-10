import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'white' | 'dark'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4'
}

const variantClasses = {
  primary: 'border-pink-primary border-t-transparent',
  white: 'border-white border-t-transparent',
  dark: 'border-gray-900 border-t-transparent'
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary',
  className 
}: LoadingSpinnerProps) {
  return (
    <div 
      className={cn(
        'animate-spin rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 shadow-2xl flex flex-col items-center space-y-4">
        <LoadingSpinner size="xl" />
        {message && (
          <p className="text-gray-700 font-medium text-lg">{message}</p>
        )}
      </div>
    </div>
  )
}

export function LoadingButton({ 
  loading, 
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <span className="flex items-center justify-center">
          <LoadingSpinner size="sm" variant="white" className="mr-2" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
