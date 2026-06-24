import { GitFork } from 'lucide-react';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Download from './components/Download';
import Footer from './components/Footer';
import { REPO } from './links';

function TopNav() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-border px-6"
      style={{
        background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <img src="/logos/hex.png" alt="ENJAMBRE" width={30} height={30} />
          <span className="wordmark text-base">ENJAMBRE</span>
        </a>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#descargar" className="hidden hover:text-foreground sm:inline">Descargar</a>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <GitFork size={16} /> GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div id="top">
      <TopNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
