import { Sidebar } from '@/components/enjambre/sidebar'
import { TopBar } from '@/components/enjambre/topbar'
import { MetricsRow } from '@/components/enjambre/metrics-row'
import { FilePanel } from '@/components/enjambre/file-panel'
import { Orchestration } from '@/components/enjambre/orchestration'
import { Conversations } from '@/components/enjambre/conversations'
import { BottomRow } from '@/components/enjambre/bottom-row'

export default function Page() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        <TopBar />
        <MetricsRow />

        {/* main 3-column work area */}
        <div className="grid grid-cols-1 gap-3 px-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_380px]">
          <FilePanel />
          <Orchestration />
          <Conversations />
        </div>

        <div className="mt-4">
          <BottomRow />
        </div>
      </main>
    </div>
  )
}
