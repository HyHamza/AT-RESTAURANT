import { Skeleton } from "@/components/ui/skeleton"

export function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-9 w-32 mb-8 rounded-lg" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cart Items */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-xl">
                      <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-5 w-32 mb-2 rounded-lg" />
                        <Skeleton className="h-4 w-20 rounded" />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="w-8 h-6 rounded" />
                        <Skeleton className="w-8 h-8 rounded-lg" />
                      </div>

                      <div className="text-right">
                        <Skeleton className="h-5 w-16 mb-2 rounded-lg" />
                        <Skeleton className="w-8 h-8 rounded-lg" />
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
          </div>

          {/* Customer Information */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <Skeleton className="h-6 w-40 mb-2 rounded-lg" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <div className="p-6">
                <div className="space-y-5">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>

                  <div>
                    <Skeleton className="h-4 w-24 mb-2 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>

                  <div>
                    <Skeleton className="h-4 w-28 mb-2 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>

                  <div>
                    <Skeleton className="h-4 w-36 mb-2 rounded" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>

                  <div className="pt-4">
                    <Skeleton className="h-14 w-full rounded-xl" />
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
