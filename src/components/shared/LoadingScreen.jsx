import { motion } from 'framer-motion'
import { UtensilsCrossed } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="text-center"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <UtensilsCrossed className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
        </div>
        <motion.h1
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-lg sm:text-xl font-bold text-gray-900"
        >
          WAROENG RCM
        </motion.h1>
        <p className="text-xs sm:text-sm text-gray-500">Kang Abuy</p>
        <div className="loading-dots mt-4">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </motion.div>
    </div>
  )
}