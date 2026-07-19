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
      {/* Gold abstract bg */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/abstract_gold.jpg`}
        className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-color-dodge"
        initial={{ scale: 1.1, rotate: 5 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 10, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/80 to-[#0A0A0A]" />

      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,179,0,0.12)_0%,transparent_70%)]" />

      {/* Content */}
      <div className="z-10 absolute inset-0 flex flex-col justify-center items-center text-center px-8" dir="rtl">

        {/* Full RIDEN logo — big reveal */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.6, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: 'drop-shadow(0 0 50px rgba(255,179,0,0.55))' }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/riden_logo_real.jpg`}
            className="w-[72vw] object-contain rounded-2xl"
            style={{ mixBlendMode: 'screen' }}
            alt="RIDEN"
          />
        </motion.div>

        {/* Slogan */}
        <div className="overflow-hidden mb-2">
          <motion.p
            className="text-[5.5vw] text-[var(--color-accent-gold)] font-bold font-body tracking-widest"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            رايدن — اركب بذكاء
          </motion.p>
        </div>

        {/* Divider line */}
        <motion.div
          className="w-0 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/60 to-transparent mb-10"
          animate={{ width: "55vw" }}
          transition={{ delay: 2, duration: 1.2, ease: "easeInOut" }}
        />

        {/* Store badges */}
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          {["App Store", "Google Play"].map((store) => (
            <div
              key={store}
              className="px-5 py-3 border border-white/20 rounded-2xl bg-white/5 backdrop-blur-md shadow-lg"
            >
              <span className="text-[3.5vw] text-white/80 font-body font-bold">{store}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
