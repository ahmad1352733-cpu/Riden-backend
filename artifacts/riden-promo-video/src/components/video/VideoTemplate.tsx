import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

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
      // Autoplay blocked — play on first user interaction
      const resume = () => { audio.play(); document.removeEventListener('click', resume); };
      document.addEventListener('click', resume);
    });
  }, []);

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      {/* Background audio */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/background.mp3`}
        preload="auto"
      />

      {/* Persistent global texture overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-10">
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] bg-repeat" />
      </div>

      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="s1" />}
        {currentScene === 1 && <Scene2 key="s2" />}
        {currentScene === 2 && <Scene3 key="s3" />}
        {currentScene === 3 && <Scene4 key="s4" />}
        {currentScene === 4 && <Scene5 key="s5" />}
      </AnimatePresence>
    </div>
  );
}
