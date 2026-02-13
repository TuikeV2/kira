import { motion } from 'framer-motion';

export default function AnimatedCard({
  children,
  className = '',
  hoverScale = 1.02,
  tapScale = 0.98,
  delay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
        delay,
      }}
      whileHover={{
        scale: hoverScale,
        transition: { type: 'spring', damping: 20, stiffness: 400 },
      }}
      whileTap={{ scale: tapScale }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
