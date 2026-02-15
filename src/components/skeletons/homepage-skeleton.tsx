import { Skeleton } from "@/components/ui/skeleton"

export function HomepageSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Section Skeleton */}
      <section className="relative bg-gradient-to-br from-pink-50 via-white to-orange-50 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <Skeleton className="h-6 w-32 mx-auto lg:mx-0 mb-6 rounded-full" />
              <Skeleton className="h-14 w-full mb-4 rounded-xl" />
              <Skeleton className="h-10 w-3/4 mb-6 rounded-xl" />
              <Skeleton className="h-20 w-full mb-8 rounded-xl" />
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                <Skeleton className="h-14 w-40 rounded-xl" />
                <Skeleton className="h-14 w-44 rounded-xl" />
              </div>
              
              {/* Stats */}
              <div className="flex items-center justify-center lg:justify-start gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-10 w-16 mb-2 rounded-lg" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right Content - Food Image */}
            <div className="relative">
              <Skeleton className="w-full h-96 lg:h-[500px] rounded-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Service Section Skeleton */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <Skeleton className="w-16 h-16 rounded-2xl mx-auto mb-4" />
                <Skeleton className="h-6 w-24 mx-auto mb-3 rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section Skeleton */}
      <section className="py-20 bg-gradient-to-r from-pink-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Skeleton className="w-full h-96 rounded-3xl" />
            
            <div>
              <Skeleton className="h-6 w-20 mb-6 rounded-full" />
              <Skeleton className="h-12 w-full mb-6 rounded-xl" />
              <Skeleton className="h-20 w-full mb-8 rounded-xl" />
              
              <div className="space-y-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center">
                    <Skeleton className="w-6 h-6 rounded-full mr-3" />
                    <Skeleton className="h-4 w-48 rounded" />
                  </div>
                ))}
              </div>
              
              <Skeleton className="h-12 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Popular Dishes Section Skeleton */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Skeleton className="h-6 w-32 mx-auto mb-6 rounded-full" />
            <Skeleton className="h-12 w-64 mx-auto mb-6 rounded-xl" />
            <Skeleton className="h-16 w-96 mx-auto rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <Skeleton className="h-48 w-full" />
                <div className="p-6">
                  <Skeleton className="h-6 w-full mb-3 rounded-lg" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-16 rounded-lg" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Skeleton className="h-12 w-32 mx-auto rounded-xl" />
          </div>
        </div>
      </section>

      {/* Testimonials Section Skeleton */}
      <section className="py-20 bg-gradient-to-r from-pink-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Skeleton className="h-6 w-24 mx-auto mb-6 rounded-full" />
            <Skeleton className="h-12 w-64 mx-auto mb-6 rounded-xl" />
            <Skeleton className="h-16 w-96 mx-auto rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-6" />
                <div className="flex justify-center mb-4 space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Skeleton key={star} className="w-5 h-5 rounded" />
                  ))}
                </div>
                <Skeleton className="h-20 w-full mb-6 rounded-lg" />
                <Skeleton className="h-5 w-24 mx-auto mb-2 rounded-lg" />
                <Skeleton className="h-4 w-20 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section Skeleton */}
      <section className="py-20 bg-gradient-to-r from-pink-500 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Skeleton className="h-12 w-64 mx-auto mb-6 bg-white/20 rounded-xl" />
          <Skeleton className="h-16 w-96 mx-auto mb-8 bg-white/20 rounded-xl" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Skeleton className="h-14 w-40 bg-white/20 rounded-xl" />
            <Skeleton className="h-14 w-44 bg-white/20 rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  )
}
