import { Skeleton } from "@/components/ui/skeleton"

export function OrderStatusSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <Skeleton className="h-9 w-48 mx-auto mb-2 rounded-lg" />
          <Skeleton className="h-5 w-64 mx-auto rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Status */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <Skeleton className="h-6 w-32 mb-6 rounded-lg" />
              
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2 rounded-lg" />
                      <Skeleton className="h-4 w-48 rounded" />
                    </div>
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <Skeleton className="h-6 w-24 mb-6 rounded-lg" />
              
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-2 rounded-lg" />
                        <Skeleton className="h-4 w-20 rounded" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-8 mb-2 rounded" />
                      <Skeleton className="h-5 w-16 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-12 rounded-lg" />
                  <Skeleton className="h-6 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <Skeleton className="h-6 w-28 mb-6 rounded-lg" />
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-4 w-14 rounded" />
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <Skeleton className="h-6 w-32 mb-6 rounded-lg" />
              
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-3 w-12 mb-2 rounded" />
                  <Skeleton className="h-5 w-32 rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-3 w-16 mb-2 rounded" />
                  <Skeleton className="h-5 w-40 rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-3 w-14 mb-2 rounded" />
                  <Skeleton className="h-5 w-28 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
