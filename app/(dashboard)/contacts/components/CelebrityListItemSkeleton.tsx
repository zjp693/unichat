export function CelebrityListItemSkeleton() {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-100">
      <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] mr-3 relative flex-shrink-0"></div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-24"></div>
          <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-20"></div>
        </div>
        <div className="flex items-center">
          <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-40"></div>
        </div>
      </div>
    </div>
  );
}
