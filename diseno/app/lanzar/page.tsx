import { LaunchSidebar } from '@/components/enjambre/launch/launch-sidebar'
import { LaunchTopBar } from '@/components/enjambre/launch/launch-topbar'
import { TaskComposer } from '@/components/enjambre/launch/task-composer'
import { LaunchBottom } from '@/components/enjambre/launch/launch-bottom'
import { ParallelChats } from '@/components/enjambre/launch/parallel-chats'

export default function LanzarPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <LaunchSidebar />
      <main className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
        <LaunchTopBar />
        <div className="grid flex-1 grid-cols-1 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-5">
            <TaskComposer />
            <LaunchBottom />
          </div>
          <ParallelChats />
        </div>
      </main>
    </div>
  )
}
