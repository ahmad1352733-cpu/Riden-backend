import { motion } from 'framer-motion';

export function Scene2() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex overflow-hidden bg-[#0A0A0A]"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%", opacity: 0, filter: "blur(10px)" }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/clip1_2.mp4`}
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        autoPlay muted loop playsInline
        initial={{ scale: 1 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 8, ease: "linear" }}
      />

      {/* Gradient — dark at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Content — center-bottom */}
      <div className="absolute bottom-[16%] left-0 right-0 z-10 flex flex-col items-center text-center px-8" dir="rtl">
        <motion.div
          className="flex items-center gap-4 mb-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div className="w-[12vw] h-[3px] bg-[var(--color-accent)] rounded-full" />
          <p className="text-[5vw] text-[var(--color-accent-gold)] font-bold font-body">بضغطة زر</p>
          <div className="w-[12vw] h-[3px] bg-[var(--color-accent)] rounded-full" />
        </motion.div>

        <motion.h2
          className="text-[11vw] font-black font-display text-white leading-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          اطلب رحلتك<br />
          <span className="text-gradient">الآن</span>
        </motion.h2>

        {/* Phone mockup icon */}
        <motion.div
          className="mt-6 w-[16vw] h-[16vw] rounded-[22%] border-[3px] border-[var(--color-accent-gold)]/60 bg-black/40 backdrop-blur-sm flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 2, type: "spring", stiffness: 180, damping: 15 }}
        >
          <motion.div
            className="w-[8vw] h-[8vw] rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-gold)]"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ delay: 2.5, duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
