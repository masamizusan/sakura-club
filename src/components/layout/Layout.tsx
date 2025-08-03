import Header from './Header'
import Footer from './Footer'
import { OfflineIndicator } from '@/components/ui/offline-indicator'
import { InstallPrompt } from '@/components/ui/install-prompt'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <OfflineIndicator />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <InstallPrompt />
    </div>
  )
}