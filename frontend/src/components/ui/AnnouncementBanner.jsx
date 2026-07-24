// frontend/src/components/ui/AnnouncementBanner.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGlobalConfig } from '../../services/globalConfigService';

// Central color themes matching backend keys
const COLOR_THEMES = {
  amber: 'from-amber-500/20 via-amber-500/10 to-amber-500/20 border-amber-500/30 bg-amber-950/40 text-amber-300',
  blue: 'from-blue-500/20 via-blue-500/10 to-blue-500/20 border-blue-500/30 bg-blue-950/40 text-blue-300',
  red: 'from-red-500/20 via-red-500/10 to-red-500/20 border-red-500/30 bg-red-950/40 text-red-300',
  emerald: 'from-emerald-500/20 via-emerald-500/10 to-emerald-500/20 border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
  purple: 'from-purple-500/20 via-purple-500/10 to-purple-500/20 border-purple-500/30 bg-purple-950/40 text-purple-300',
};

// Green alias mapping
COLOR_THEMES['green'] = COLOR_THEMES['emerald'];

export default function AnnouncementBanner() {
  const [globalConfig, setGlobalConfig] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Check session storage dismissal
    const isDismissed = sessionStorage.getItem('announcement_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    const loadConfig = async () => {
      try {
        const config = await fetchGlobalConfig();
        if (isMounted && config) {
          setGlobalConfig(config);
        }
      } catch (err) {
        console.error('Failed to load global config for announcement banner:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || dismissed || !globalConfig) return null;

  // Check display boolean flag and text validity
  if (globalConfig.showAnnouncement === false || !globalConfig.announcementText) {
    return null;
  }

  // Color mapping
  const styleKey = (globalConfig.announcementColor || 'amber').toLowerCase();
  const themeClasses = COLOR_THEMES[styleKey] || COLOR_THEMES.amber;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        aria-label="Announcement"
        className={`relative w-full border-b backdrop-blur-xl bg-gradient-to-r shadow-lg overflow-hidden z-20 ${themeClasses}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          {/* Container with Edge Masks for Smooth Edge Fade in / Fade out */}
          <div className="relative w-full overflow-hidden flex items-center justify-center [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]">
            
            <motion.div
              className="whitespace-nowrap inline-block font-semibold text-xs sm:text-sm text-white drop-shadow-md"
              animate={{
                x: ['100%', '-100%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 12, // Slide වෙන සම්පූර්ණ කාලය (Seconds වලින් - අවශ්‍ය නම් අඩු වැඩි කරගත හැක)
                repeat: Infinity,
                ease: 'linear',
                times: [0, 0.1, 0.9, 1], // Slide එකේ මුලදී Fade in වී අගදී Fade out වීම සාලාසයි
              }}
            >
              {globalConfig.announcementText}
            </motion.div>

          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}