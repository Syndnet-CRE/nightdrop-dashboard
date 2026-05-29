import { useState, useEffect } from 'react';
import { PipelineTimeline } from './PipelineTimeline';
import propcloudLogoDark from '../assets/propcloud-logo-dark.png';
import propcloudLogoLight from '../assets/propcloud-logo-light.png';

// Theme-aware logo swap. Same `useTheme` pattern as PipelineTimeline.jsx:
// reads document.documentElement.dataset.theme and observes mutations so
// the logo flips immediately when the user toggles theme in SettingsView.
function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export default function TopHeader() {
  const theme = useTheme();
  const logoSrc = theme === 'light' ? propcloudLogoLight : propcloudLogoDark;

  return (
    <header className="top-header">
      <div className="top-header-left">
        <img src={logoSrc} alt="propcloud.ai" className="top-header-logo" />
      </div>

      <div className="top-header-center">
        <PipelineTimeline mode="track" showLabels showPhase={false} />
      </div>

      <div className="top-header-right">
        <PipelineTimeline mode="countdown" size="header" />
      </div>
    </header>
  );
}
