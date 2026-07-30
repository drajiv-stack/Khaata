export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[60vh] space-y-4">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-gray-500 animate-pulse">Loading data...</p>
    </div>
  )
}
