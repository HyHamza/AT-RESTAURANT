import { Skeleton } from "@/components/ui/skeleton"

export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
          <div className="text-center mb-8">
            {/* Logo Skeleton */}
            <Skeleton className="w-16 h-16 rounded-2xl mx-auto mb-6" />
            <Skeleton className="h-8 w-48 mx-auto mb-3 rounded-lg" />
            <Skeleton className="h-4 w-64 mx-auto rounded-lg" />
          </div>
          
          <div className="space-y-5">
            {/* Input Field Skeletons */}
            <div>
              <Skeleton className="h-4 w-28 mb-2 rounded" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            
            <div>
              <Skeleton className="h-4 w-24 mb-2 rounded" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            
            {/* Button Skeleton */}
            <Skeleton className="h-14 w-full rounded-lg mt-6" />
            
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">Loading...</span>
              </div>
            </div>
            
            {/* Link Skeleton */}
            <Skeleton className="h-5 w-40 mx-auto rounded" />
          </div>
        </div>
        
        {/* Footer Skeleton */}
        <div className="text-center mt-6">
          <Skeleton className="h-4 w-56 mx-auto rounded" />
        </div>
      </div>
    </div>
  )
}
