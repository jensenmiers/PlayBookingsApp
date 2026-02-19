export function TicketTearLine() {
  return (
    <div className="relative flex items-center my-6">
      <div className="w-4 h-8 -ml-6 bg-background rounded-r-full flex-shrink-0" />
      <div className="flex-1 border-t-2 border-dashed border-secondary-50/10" />
      <div className="w-4 h-8 -mr-6 bg-background rounded-l-full flex-shrink-0" />
    </div>
  )
}
