import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-9 w-48 mb-2 rounded-lg" />
            <Skeleton className="h-5 w-64 rounded" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <Skeleton className="h-6 w-32 rounded-lg" />
              </div>
              <div className="p-6">
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
                  <div>
                    <Skeleton className="h-3 w-24 mb-2 rounded" />
                    <Skeleton className="h-5 w-36 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
              <div className="p-6 border-b border-gray-100">
                <Skeleton className="h-6 w-32 rounded-lg" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-6 w-8 rounded-lg" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-6 w-6 rounded-lg" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-6 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <Skeleton className="h-6 w-28 rounded-lg" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <div>
                            <Skeleton className="h-5 w-32 mb-2 rounded-lg" />
                            <Skeleton className="h-4 w-24 rounded" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-6 w-16 mb-2 rounded-lg" />
                          <Skeleton className="h-5 w-20 rounded-lg" />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <Skeleton className="h-4 w-40 rounded" />
                        <Skeleton className="h-9 w-24 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
