import { motion } from 'framer-motion'
import { Award, Star, Crown, ShoppingBag, DollarSign, Gift, TrendingUp } from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import { formatCurrency } from '../../utils/format'

export default function Membership() {
  const { profile } = useAuthStore()

  const levels = [
    {
      id: 'member_baru',
      name: 'Member Baru',
      icon: Star,
      color: 'from-gray-400 to-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      benefits: [
        'Akses ke semua menu',
        'Voucher selamat datang',
        'Notifikasi promo terbaru'
      ],
      requirement: '0 - 9 transaksi',
      progress: profile?.total_orders || 0,
      maxProgress: 9
    },
    {
      id: 'member_setia',
      name: 'Member Setia',
      icon: Award,
      color: 'from-blue-400 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      benefits: [
        'Semua benefit Member Baru',
        'Voucher transaksi ke-5 & ke-10',
        'Promo eksklusif member',
        'Priority support'
      ],
      requirement: '10 - 19 transaksi',
      progress: profile?.total_orders || 0,
      maxProgress: 19
    },
    {
      id: 'vip',
      name: 'VIP Customer',
      icon: Crown,
      color: 'from-yellow-400 to-amber-600',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      benefits: [
        'Semua benefit Member Setia',
        'Voucher ulang tahun',
        'Voucher transaksi ke-20',
        'Diskon spesial VIP',
        'Akses menu eksklusif',
        'Gift spesial'
      ],
      requirement: '20+ transaksi',
      progress: profile?.total_orders || 0,
      maxProgress: 20
    }
  ]

  const currentLevel = profile?.membership_level || 'member_baru'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Membership</h1>
      <p className="text-gray-500 mb-8">Program loyalitas Waroeng RCM Kang Abuy</p>

      {/* Current Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Status Membership</h2>
            <p className="text-sm text-gray-500 mt-1">Level saat ini</p>
          </div>
          <div className={`px-4 py-2 rounded-xl ${
            currentLevel === 'vip' ? 'bg-yellow-100 text-yellow-700' :
            currentLevel === 'member_setia' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            <span className="font-bold text-lg">
              {currentLevel === 'vip' && '👑 VIP'}
              {currentLevel === 'member_setia' && '🌟🌟 Member Setia'}
              {currentLevel === 'member_baru' && '⭐ Member Baru'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{profile?.total_orders || 0}</p>
            <p className="text-xs text-gray-500">Total Order</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(profile?.total_spent || 0)}</p>
            <p className="text-xs text-gray-500">Total Spent</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <Gift className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">3</p>
            <p className="text-xs text-gray-500">Voucher Tersedia</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {currentLevel === 'vip' ? 'Maksimal' : 
               currentLevel === 'member_setia' ? `${20 - (profile?.total_orders || 0)} lagi` :
               `${10 - (profile?.total_orders || 0)} lagi`}
            </p>
            <p className="text-xs text-gray-500">Menuju Level Berikutnya</p>
          </div>
        </div>
      </div>

      {/* Membership Levels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {levels.map((level, index) => {
          const Icon = level.icon
          const isActive = currentLevel === level.id
          const isPassed = levels.indexOf(levels.find(l => l.id === currentLevel)) > index

          return (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-6 border-2 transition-all ${
                isActive
                  ? `${level.borderColor} ${level.bgColor} shadow-lg scale-105`
                  : isPassed
                  ? 'border-gray-200 bg-gray-50 opacity-75'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold rounded-full">
                  CURRENT
                </div>
              )}

              <div className="text-center mb-4">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-lg font-bold ${level.textColor}`}>{level.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{level.requirement}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min((level.progress / level.maxProgress) * 100, 100)}%` 
                  }}
                  className={`h-2 rounded-full bg-gradient-to-r ${level.color}`}
                />
              </div>

              {/* Benefits */}
              <ul className="space-y-2">
                {level.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span className={isActive || isPassed ? 'text-gray-700' : 'text-gray-400'}>
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}