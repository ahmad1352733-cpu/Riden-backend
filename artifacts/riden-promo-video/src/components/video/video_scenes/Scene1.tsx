import { motion } from 'framer-motion';

export function Scene1() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex justify-center items-center overflow-hidden bg-black"
      initial={{ clipPath: "circle(0% at 50% 50%)" }}
      animate={{ clipPath: "circle(150% at 50% 50%)" }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/clip3.mp4`}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay muted loop playsInline
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 6, ease: "easeOut" }}
      />

      {/* Dark gradient — stronger at bottom for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Content — bottom-third of screen */}
      <div className="absolute bottom-[16%] left-0 right-0 z-10 flex flex-col items-center text-center px-8" dir="rtl">
        <motion.h1
          className="text-[9vw] font-black font-display text-white drop-shadow-2xl mb-3 leading-tight"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          عمان لا تنام...
        </motion.h1>

        <motion.div
          className="w-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)] to-transparent"
          animate={{ width: "60vw" }}
          transition={{ delay: 1.5, duration: 1.5, ease: "easeInOut" }}
        />

        <motion.p
          className="text-[5vw] text-[var(--color-text-secondary)] font-body font-medium mt-5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          وكذلك نحن.
        </motion.p>
      </div>
    </motion.div>
  );
}
