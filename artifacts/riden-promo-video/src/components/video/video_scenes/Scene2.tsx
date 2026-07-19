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
      <div className="absolute inset-0 bg-gradient-to-l from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
      
      <div className="z-10 w-full h-full flex flex-col justify-center items-end px-[10vw]" dir="rtl">
        <motion.div
          className="flex items-center gap-6 mb-6"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
        >
          <div className="w-[8vw] h-[4px] bg-[var(--color-accent)] rounded-full" />
          <p className="text-[2vw] text-[var(--color-accent-gold)] font-bold font-body">بضغطة زر</p>
        </motion.div>
        
        <motion.h2
          className="text-[5vw] font-black font-display text-white leading-[1.2]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          اطلب رحلتك<br/>
          <span className="text-gradient">الآن</span>
        </motion.h2>

        <motion.div
          className="absolute left-[15vw] top-1/2 -translate-y-1/2"
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 1.8, type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.img 
            src={`${import.meta.env.BASE_URL}images/map_pin.png`} 
            className="w-[15vw] h-auto drop-shadow-2xl filter drop-shadow-[0_0_30px_rgba(255,138,0,0.4)]" 
            alt="Pin" 
            animate={{ y: [0, -20, 0] }}
            transition={{ delay: 3, duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
