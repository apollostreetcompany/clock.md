import ClockLandingPage from './components/ClockLandingPage';
import { BLOG_URL, GITHUB_URL, RAW_CLOCK_MD_URL, STRIPE_PAYMENT_LINK } from './config';

export default function App() {
  return (
    <ClockLandingPage
      onInstallClick={() => window.open(RAW_CLOCK_MD_URL, '_blank', 'noopener,noreferrer')}
      onBuyClick={() => {
        if (!STRIPE_PAYMENT_LINK) return;
        window.open(STRIPE_PAYMENT_LINK, '_blank', 'noopener,noreferrer');
      }}
      onGithubClick={() => window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')}
      onBlogClick={() => window.open(BLOG_URL, '_blank', 'noopener,noreferrer')}
    />
  );
}
