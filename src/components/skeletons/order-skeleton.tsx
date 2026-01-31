import { Skeleton } from "@/components/ui/skeleton"

export function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-9 w-32 mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cart Items */}
          <div>
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="w-16 h-16 rounded-lg" />
                      
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-20" />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Skeleton className="w-8 h-8" />
                        <Skeleton className="w-8 h-6" />
                        <Skeleton className="w-8 h-8" />
                      </div>

                      <div className="text-right">
                        <Skeleton className="h-5 w-16 mb-2" />
                        <Skeleton className="w-8 h-8" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>

                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>

                  <div>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>

                  <div>
                    <Skeleton className="h-4 w-36 mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </div>

                  <div className="pt-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}