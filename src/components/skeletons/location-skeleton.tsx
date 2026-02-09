import { Skeleton } from "@/components/ui/skeleton"

export function LocationSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Skeleton className="h-9 w-64 mx-auto mb-3 rounded-lg" />
          <Skeleton className="h-5 w-96 mx-auto rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location Form */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <Skeleton className="h-6 w-40 mb-6 rounded-lg" />
              
              <div className="space-y-5">
                {/* Search Input */}
                <div>
                  <Skeleton className="h-4 w-32 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400">or</span>
                  </div>
                </div>

                {/* Manual Address Fields */}
                <div>
                  <Skeleton className="h-4 w-24 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>

                <div>
                  <Skeleton className="h-4 w-16 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-12 mb-2 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                </div>

                <div>
                  <Skeleton className="h-4 w-36 mb-2 rounded" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Saved Addresses */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
              <Skeleton className="h-6 w-36 mb-6 rounded-lg" />
              
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <Skeleton className="h-5 w-24 mb-2 rounded-lg" />
                          <Skeleton className="h-4 w-full mb-1 rounded" />
                          <Skeleton className="h-4 w-3/4 rounded" />
                        </div>
                      </div>
                      <Skeleton className="w-8 h-8 rounded-lg" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-8">
              <Skeleton className="h-[600px] w-full" />
              <div className="p-4 border-t border-gray-100">
                <Skeleton className="h-4 w-48 mb-2 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
