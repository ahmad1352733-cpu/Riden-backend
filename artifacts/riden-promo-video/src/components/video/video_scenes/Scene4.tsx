import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex overflow-hidden bg-[#0A0A0A]"
      initial={{ clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)" }}
      animate={{ clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)" }}
      exit={{ opacity: 0, filter: "blur(20px)", scale: 0.9 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.img
        src={`${import.meta.env.BASE_URL}images/abstract_gold.jpg`}
        className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50"
        initial={{ rotate: -5, scale: 1.2 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 6, ease: "easeOut" }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0A0A0A_80%)]" />

      {/* Centered vertically in frame */}
      <div className="z-10 absolute inset-0 flex flex-col justify-center items-center text-center px-8" dir="rtl">
        {/* Checkmark circle */}
        <motion.div
          className="relative w-[22vw] h-[22vw] rounded-full border-[4px] border-[var(--color-accent-gold)] flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(255,179,0,0.35)] bg-black/50 backdrop-blur-sm"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 150, damping: 20 }}
        >
          <motion.svg
            className="w-[11vw] h-[11vw] text-[var(--color-accent-gold)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.5, duration: 1, ease: "easeInOut" }}
            />
          </motion.svg>

          <motion.div
            className="absolute inset-0 rounded-full border border-[var(--color-accent-gold)]"
            animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
            transition={{ delay: 2, duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.div>

        <motion.h2
          className="text-[13vw] font-black font-display text-white leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 1, ease: "easeOut" }}
        >
          وصلت <span className="text-gradient">بأمان</span>
        </motion.h2>
      </div>
    </motion.div>
  );
}
