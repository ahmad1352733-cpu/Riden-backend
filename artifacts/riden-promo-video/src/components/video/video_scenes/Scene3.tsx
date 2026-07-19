import { motion } from 'framer-motion';

export function Scene3() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex justify-center items-center overflow-hidden bg-black"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/clip2_2.mp4`}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay muted loop playsInline
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 7, ease: "easeOut" }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Speed lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[60vw] h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)] to-transparent opacity-40"
            style={{ top: `${30 + i * 10}%`, left: "-60vw" }}
            animate={{ x: ["0vw", "200vw"] }}
            transition={{
              duration: 1.5,
              delay: i * 0.3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Content — bottom */}
      <div className="absolute bottom-[16%] left-0 right-0 z-10 flex flex-col items-center text-center px-8" dir="rtl">
        <div className="overflow-hidden mb-5">
          <motion.h2
            className="text-[11vw] font-black font-display text-white leading-tight"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          >
            كابتن على الطريق
          </motion.h2>
        </div>

        <motion.div
          className="flex gap-3 items-center bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-[0_0_20px_rgba(255,138,0,0.25)]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <motion.div
            className="w-[3vw] h-[3vw] rounded-full bg-[var(--color-success)] shadow-[0_0_10px_#00E676]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <span className="text-[4.5vw] font-body text-white font-bold">يصل في 3 دقائق</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
