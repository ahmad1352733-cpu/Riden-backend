import { motion } from 'framer-motion';

export function Scene5() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex justify-center items-center overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ duration: 1.5 }}
    >
      <motion.img
        src={`${import.meta.env.BASE_URL}images/abstract_gold.jpg`}
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-color-dodge"
        initial={{ scale: 1.1, rotate: 5 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 10, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/80 to-[#0A0A0A]" />
      
      <div className="z-10 flex flex-col items-center justify-center w-full" dir="rtl">
        {/* Logo Mark */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="w-[12vw] h-[12vw] bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent)] rounded-3xl flex items-center justify-center shadow-[0_0_80px_rgba(255,138,0,0.5)]">
             <span className="text-[6vw] font-black font-display text-[#0A0A0A] tracking-tighter mr-2">R</span>
          </div>
        </motion.div>
        
        {/* Brand Name */}
        <motion.h1
          className="text-[8vw] font-black font-display tracking-widest text-white uppercase leading-none mb-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1, ease: "easeOut" }}
        >
          RIDEN
        </motion.h1>
        
        {/* Tagline */}
        <motion.div className="overflow-hidden mt-4">
          <motion.p
            className="text-[3vw] text-[var(--color-accent-gold)] font-bold font-body tracking-wide"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            رايدن — اركب بذكاء
          </motion.p>
        </motion.div>
        
        {/* Download Badges Placeholders */}
        <motion.div
          className="flex gap-6 mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          <div className="w-[14vw] h-[4vw] border border-white/20 rounded-xl bg-white/5 flex items-center justify-center backdrop-blur-md shadow-lg">
            <span className="text-[1.2vw] text-white/80 font-body font-bold">App Store</span>
          </div>
          <div className="w-[14vw] h-[4vw] border border-white/20 rounded-xl bg-white/5 flex items-center justify-center backdrop-blur-md shadow-lg">
            <span className="text-[1.2vw] text-white/80 font-body font-bold">Google Play</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
