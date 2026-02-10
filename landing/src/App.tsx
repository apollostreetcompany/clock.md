import ClockLandingPage from './components/ClockLandingPage';

const WEBSITE_URL = 'https://clock.md';
const GITHUB_URL = 'https://github.com/apollostreetcompany/clock.md';
const INSTALL_URL = 'https://raw.githubusercontent.com/apollostreetcompany/clock.md/main/clock.md';

export default function App() {
  return (
    <ClockLandingPage
      onInstallClick={() => window.open(INSTALL_URL, '_blank', 'noopener,noreferrer')}
      onBuyClick={() => window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer')}
      onGithubClick={() => window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')}
      onBlogClick={() => window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer')}
    />
  );
}
