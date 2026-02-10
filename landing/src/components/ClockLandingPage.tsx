import { motion } from 'framer-motion';
import { WaveMatrix } from './WaveMatrix';
import { Download, ShoppingCart, Github, BookOpen } from 'lucide-react';

export interface ClockLandingPageProps {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaSubtext?: string;
  guideTitle?: string;
  guidePrice?: string;
  onInstallClick?: () => void;
  onBuyClick?: () => void;
  onGithubClick?: () => void;
  onBlogClick?: () => void;
}

export const ClockLandingPage = ({
  headline = 'Give Time To Your Agent',
  subheadline = 'Let your agent know what time it is and reason temporally.',
  ctaText = 'Install clock.md',
  ctaSubtext = '1 click install to let your agent know what time it is and reason temporally.',
  guideTitle = 'Advanced Agent Timekeeping Guide',
  guidePrice = '$9',
  onInstallClick = () => window.open('#install', '_self'),
  onBuyClick = () => window.open('#buy', '_self'),
  onGithubClick = () => window.open('#github', '_self'),
  onBlogClick = () => window.open('#blog', '_self')
}: ClockLandingPageProps) => {
  return (
    <div className="w-screen min-h-screen bg-black flex flex-col items-center justify-between overflow-hidden relative">
      {/* Background with grain effect */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        className="absolute inset-0 opacity-[0.10] mix-blend-screen pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"%3E%3Cfilter id=\"n\" x=\"0\" y=\"0\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"200\" height=\"200\" filter=\"url(%23n)\" opacity=\"0.4\"/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat'
        }}
      />

      {/* Main content container - vertically stacked */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl px-6 md:px-12 pt-12 md:pt-20 pb-8 gap-12 md:gap-16 flex-1">
        {/* Headline section */}
        <motion.div
          className="flex flex-col items-center w-full"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white text-center tracking-tighter mb-6 md:mb-8 leading-none">
            {headline}
          </h1>
          <motion.p
            className="text-xl md:text-2xl lg:text-3xl text-white/80 text-center max-w-3xl leading-relaxed font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            {subheadline}
          </motion.p>
        </motion.div>

        {/* Wave Matrix */}
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          style={{ perspective: '1000px' }}
        >
          <div className="transform scale-75 md:scale-90 lg:scale-100">
            <WaveMatrix dotSize={12} gap={6} brightness={1} />
          </div>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          className="flex flex-col items-center w-full gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
        >
          <button
            onClick={onInstallClick}
            className="group relative px-12 py-6 md:px-16 md:py-8 bg-white rounded-2xl shadow-2xl hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              boxShadow:
                '0 20px 60px rgba(255, 255, 255, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-4">
              <Download className="w-8 h-8 md:w-10 md:h-10 text-black group-hover:text-black/80 transition-colors" />
              <span className="text-3xl md:text-4xl lg:text-5xl font-black text-black tracking-tight">
                {ctaText}
              </span>
            </div>
          </button>
          <p className="text-sm md:text-base text-white/60 text-center max-w-xl font-medium">{ctaSubtext}</p>
          <p className="text-xs md:text-sm text-white/40 text-center max-w-xl">
            Get the spec from GitHub, or download the latest clock.md directly.
          </p>
        </motion.div>

        {/* Secondary Container */}
        <motion.div
          className="flex flex-col items-center w-full max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
        >
          <div className="w-full px-8 py-8 md:px-10 md:py-10 rounded-2xl bg-white/5 backdrop-blur-md border border-white/20 shadow-xl">
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-2 tracking-tight">
                {guideTitle}
              </h2>
              <p className="text-lg md:text-xl text-white/60 text-center">Deep dive into temporal reasoning for AI agents</p>
            </div>

            <button
              onClick={onBuyClick}
              className="group w-full px-8 py-5 bg-white/10 hover:bg-white/15 rounded-xl border border-white/30 hover:border-white/50 transition-all duration-300 shadow-lg hover:shadow-xl"
              style={{
                boxShadow:
                  '0 10px 30px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="flex items-center justify-center gap-3">
                <ShoppingCart className="w-6 h-6 md:w-7 md:h-7 text-white/90 group-hover:text-white transition-colors" />
                <span className="text-2xl md:text-3xl font-bold text-white/90 group-hover:text-white transition-colors">
                  Buy ({guidePrice})
                </span>
              </div>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        className="relative z-10 w-full border-t border-white/10 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-8 md:py-10">
          <div className="flex items-center justify-center gap-8 md:gap-12">
            <button
              onClick={onGithubClick}
              className="group flex flex-col items-center gap-2 transition-all duration-300 hover:scale-110"
              aria-label="View on Github"
            >
              <div className="p-3 rounded-full bg-white/5 border border-white/20 group-hover:bg-white/10 group-hover:border-white/40 transition-all duration-300">
                <Github className="w-7 h-7 md:w-8 md:h-8 text-white/80 group-hover:text-white transition-colors" />
              </div>
              <span className="text-sm md:text-base font-medium text-white/70 group-hover:text-white transition-colors">Github</span>
            </button>

            <button
              onClick={onBlogClick}
              className="group flex flex-col items-center gap-2 transition-all duration-300 hover:scale-110"
              aria-label="Read our Blog"
            >
              <div className="p-3 rounded-full bg-white/5 border border-white/20 group-hover:bg-white/10 group-hover:border-white/40 transition-all duration-300">
                <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-white/80 group-hover:text-white transition-colors" />
              </div>
              <span className="text-sm md:text-base font-medium text-white/70 group-hover:text-white transition-colors">Blog</span>
            </button>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default ClockLandingPage;
