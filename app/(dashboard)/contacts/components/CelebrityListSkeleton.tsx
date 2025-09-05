export function CelebrityListSkeleton() {
  return (
    <div className="bg-white">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center px-4 py-3 border-b border-gray-100">
          {/* 头像骨架 */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] mr-3 relative flex-shrink-0">
            {/* 认证徽章骨架 */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full"></div>
          </div>

          {/* 信息骨架 */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* 第一行：姓名和金额 */}
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-24"></div>
              <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-20"></div>
            </div>

            {/* 第二行：钱包地址 */}
            <div className="flex items-center">
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-40"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
