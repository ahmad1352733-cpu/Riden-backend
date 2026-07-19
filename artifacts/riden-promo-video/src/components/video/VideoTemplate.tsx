import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  scene1: 5000,
  scene2: 6000,
  scene3: 6000,
  scene4: 5000,
  scene5: 8000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.7;
    audio.loop = true;
    audio.play().catch(() => {
      const resume = () => { audio.play(); document.removeEventListener('click', resume); };
      document.addEventListener('click', resume);
    });
  }, []);

  return (
    /* Full-screen container — black bg behind the portrait frame */
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">

      {/* Portrait 9:16 frame — fills full height, width auto-fits */}
      <div
        className="relative overflow-hidden bg-black"
        style={{
          aspectRatio: '9/16',
          height: '100%',
          maxWidth: '100%',
          /* On wide screens keep it phone-shaped; on phones it fills everything */
        }}
      >
        {/* Background audio */}
        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/music.mp3`}
          preload="auto"
        />

        {/* Grain overlay */}
        <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-10">
          <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] bg-repeat" />
        </div>

        {/* Scenes */}
        <AnimatePresence mode="sync">
          {currentScene === 0 && <Scene1 key="s1" />}
          {currentScene === 1 && <Scene2 key="s2" />}
          {currentScene === 2 && <Scene3 key="s3" />}
          {currentScene === 3 && <Scene4 key="s4" />}
          {currentScene === 4 && <Scene5 key="s5" />}
        </AnimatePresence>

        {/* Persistent logo — top-left on scenes 1-4 */}
        {currentScene < 4 && (
          <motion.div
            key={`logo-${currentScene}`}
            className="absolute top-[3%] left-[4%] z-40"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/riden_logo_real.jpg`}
              className="h-[6vh] object-contain rounded-lg"
              style={{ mixBlendMode: 'screen' }}
              alt="RIDEN"
            />
          </motion.div>
        )}

        {/* Download button — bottom center */}
        <a
          href={`${import.meta.env.BASE_URL}videos/riden-promo-final.mp4`}
          download="riden-promo.mp4"
          className="absolute bottom-[3%] left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold font-body text-black"
          style={{ background: 'linear-gradient(135deg, #FF8A00, #FFB300)' }}
          dir="rtl"
        >
          <Download size={18} />
          تحميل الفيديو
        </a>
      </div>
    </div>
  );
}
