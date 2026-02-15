import { Skeleton } from "@/components/ui/skeleton"

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-9 w-32 mb-2 rounded-lg" />
          <Skeleton className="h-5 w-64 rounded" />
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-6 mb-6">
                <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2 rounded-lg" />
                  <Skeleton className="h-4 w-48 mb-4 rounded" />
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Skeleton className="h-4 w-20 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2 rounded" />
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
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                <Skeleton className="h-11 w-24 rounded-lg" />
                <Skeleton className="h-11 w-32 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <Skeleton className="h-6 w-36 rounded-lg" />
            </div>
            <div className="p-6">
              <div className="space-y-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-2 rounded-lg" />
                      <Skeleton className="h-4 w-64 rounded" />
                    </div>
                    <Skeleton className="w-12 h-6 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <Skeleton className="h-6 w-28 rounded-lg" />
            </div>
            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <Skeleton className="h-4 w-24 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div>
                  <Skeleton className="h-4 w-32 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                <Skeleton className="h-11 w-24 rounded-lg" />
                <Skeleton className="h-11 w-32 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <Skeleton className="h-4 w-32 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div>
                  <Skeleton className="h-4 w-28 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div>
                  <Skeleton className="h-4 w-36 mb-2 rounded" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                <Skeleton className="h-11 w-36 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100">
            <div className="p-6 border-b border-red-100">
              <Skeleton className="h-6 w-28 rounded-lg" />
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2 rounded-lg" />
                  <Skeleton className="h-4 w-80 rounded" />
                </div>
                <Skeleton className="h-11 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
