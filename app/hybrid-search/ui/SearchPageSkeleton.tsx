// app/hybrid-search/ui/MinimalSkeleton.tsx
export default function MinimalSkeleton() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="w-48 h-8 bg-gray-200 rounded mb-2"></div>
          <div className="w-28 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>

      {/* 搜索框 */}
      <div className="text-center mb-8">
        <div className="w-full max-w-2xl h-10 bg-gray-200 rounded-lg mx-auto mb-4"></div>
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-7 w-20 bg-gray-200 rounded-full"></div>
          ))}
        </div>
      </div>

      {/* 结果区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="h-16 bg-gray-200 rounded mb-4"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-4">
              <div className="w-3/4 h-5 bg-gray-200 rounded mb-2"></div>
              <div className="w-full h-8 bg-gray-200 rounded mb-2"></div>
              <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-5">
          <div className="h-16 bg-gray-200 rounded mb-4"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-4">
              <div className="w-3/4 h-5 bg-gray-200 rounded mb-2"></div>
              <div className="w-full h-8 bg-gray-200 rounded mb-2"></div>
              <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
