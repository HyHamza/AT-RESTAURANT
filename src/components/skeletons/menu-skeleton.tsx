import { Skeleton } from "@/components/ui/skeleton"

export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-9 w-48 mb-2 rounded-lg" />
              <Skeleton className="h-5 w-64 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-6 w-20 mb-4 rounded-lg" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-12 w-32 rounded-xl" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-28 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <Skeleton className="h-48 w-full" />
              <div className="p-5">
                <div className="mb-4">
                  <Skeleton className="h-6 w-full mb-2 rounded-lg" />
                  <Skeleton className="h-12 w-full mb-3 rounded-lg" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-16 rounded-lg" />
                    <Skeleton className="h-6 w-20 rounded-lg" />
                  </div>
                </div>
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
