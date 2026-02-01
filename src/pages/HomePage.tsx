import { Link } from 'react-router-dom'
import { Terminal, Crosshair, Zap, Shield, Trophy, Users, Activity, Lock, DollarSign, Eye, Gift } from 'lucide-react'
import { useState, useEffect } from 'react'

interface GameStat {
  label: string
  val: string | number
  icon: React.ElementType
}

interface GameItem {
  id: string
  path: string
  name: string
  icon: React.ReactNode
  desc: string
  accent: string
  border: string
  disabled?: boolean
  stats: GameStat[]
}

export function HomePage() {
  // Live data simulation (will be replaced with real contract data)
  const [liveData, setLiveData] = useState({
    hashPlayers: 842,
    slotsPool: 230400,
    sniperWin: 1500,
    auctionBid: 42050,
    oracleOdds: 2.1
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => ({
        hashPlayers: Math.max(800, prev.hashPlayers + Math.floor(Math.random() * 5) - 2),
        slotsPool: prev.slotsPool + Math.floor(Math.random() * 100),
        sniperWin: Math.random() > 0.7 ? Math.floor(Math.random() * 5000) : prev.sniperWin,
        auctionBid: prev.auctionBid + Math.floor(Math.random() * 100),
        oracleOdds: 2.1 + (Math.random() * 0.1 - 0.05)
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const menuItems: GameItem[] = [
    {
      id: 'HASH',
      path: '/play',
      name: '$HASH_ORIGINAL',
      icon: <Terminal size={28} />,
      desc: 'PREDICT THE BLOCK HEX. THE OG.',
      accent: 'text-green-400',
      border: 'group-hover:border-green-400/50',
      stats: [
        { label: 'POOL', val: '45,230', icon: Trophy },
        { label: 'DEGENS', val: liveData.hashPlayers, icon: Users },
        { label: 'LAST WIN', val: '250 $HASH', icon: Activity }
      ]
    },
    {
      id: 'SLOTS',
      path: '/slots',
      name: 'CYBER_SLOTS',
      icon: <Zap size={28} />,
      desc: 'HIGH VOLATILITY. NEON CRASH.',
      accent: 'text-purple-400',
      border: 'group-hover:border-purple-400/50',
      disabled: true,
      stats: [
        { label: 'JACKPOT', val: liveData.slotsPool.toLocaleString(), icon: Trophy },
        { label: 'PLAYING', val: '1,204', icon: Users },
        { label: 'MAX WIN', val: '500x', icon: Activity }
      ]
    },
    {
      id: 'SNIPER',
      path: '/sniper',
      name: 'ASCII_SNIPER',
      icon: <Crosshair size={28} />,
      desc: 'ONE SHOT. MIL-SPEC PRECISION.',
      accent: 'text-orange-400',
      border: 'group-hover:border-orange-400/50',
      disabled: true,
      stats: [
        { label: 'TARGETS', val: '89/100', icon: Trophy },
        { label: 'ACTIVE', val: '312', icon: Users },
        { label: 'REC. WIN', val: `+${liveData.sniperWin}`, icon: Activity }
      ]
    },
    {
      id: 'POKER',
      path: '/poker',
      name: 'HASH_POKER',
      icon: <Shield size={28} />,
      desc: 'PVP TABLE. HIGH ROLLERS ONLY.',
      disabled: true,
      accent: 'text-blue-400',
      border: 'border-white/10',
      stats: [
        { label: 'WAITLIST', val: '12,403', icon: Lock },
        { label: 'MIN BUY', val: '10K', icon: DollarSign },
        { label: 'LAUNCH', val: 'Q3 2026', icon: Activity }
      ]
    },
    {
      id: 'ORACLE',
      path: '/oracle',
      name: 'ORACLE_BET',
      icon: <Eye size={28} />,
      desc: 'PREDICT REAL WORLD EVENTS.',
      disabled: true,
      accent: 'text-yellow-400',
      border: 'border-white/10',
      stats: [
        { label: 'NEXT', val: 'FED RATE', icon: Lock },
        { label: 'ODDS', val: liveData.oracleOdds.toFixed(2) + 'x', icon: Activity },
        { label: 'POOL', val: '1.2M', icon: Trophy }
      ]
    },
    {
      id: 'AUCTION',
      path: '/auction',
      name: 'AUCTION_BLIND',
      icon: <Gift size={28} />,
      desc: 'SECRET BIDDING. WINNER TAKES ALL.',
      disabled: true,
      accent: 'text-red-400',
      border: 'border-white/10',
      stats: [
        { label: 'TOP BID', val: liveData.auctionBid.toLocaleString(), icon: DollarSign },
        { label: 'ITEMS', val: '3 RARE', icon: Trophy },
        { label: 'ENDS', val: '02:14:00', icon: Activity }
      ]
    },
  ]

  const CardWrapper = ({ item, children }: { item: GameItem, children: React.ReactNode }) => {
    const baseClasses = `group relative bg-black border border-white/20 p-0 flex flex-col text-left transition-all duration-300`
    const stateClasses = item.disabled 
      ? 'opacity-40 cursor-not-allowed grayscale' 
      : `hover:border-white/60 hover:-translate-y-1 hover:shadow-xl ${item.border}`

    if (item.disabled) {
      return <div className={`${baseClasses} ${stateClasses}`}>{children}</div>
    }
    return (
      <Link to={item.path} className={`${baseClasses} ${stateClasses}`}>
        {children}
      </Link>
    )
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="mb-10 text-center border-y border-white/10 py-8 bg-white/5">
        <h1 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Basement</span>
          <span className="ml-2 text-green-500">Hub</span>
        </h1>
        <p className="text-gray-400 text-xs md:text-sm max-w-xl mx-auto tracking-widest mt-4">
          // NO KYC // INSTANT PAYOUTS // PROVABLY FAIR
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <CardWrapper key={item.id} item={item}>
            {/* Card Header */}
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div className={`${item.accent} p-2 border border-white/10 bg-white/5`}>
                  {item.icon}
                </div>
                <span className={`text-[9px] border px-1 opacity-70 ${item.disabled ? 'border-gray-600' : 'border-current ' + item.accent}`}>
                  {item.disabled ? 'OFFLINE' : 'LIVE V1.0'}
                </span>
              </div>
              <h3 className="text-2xl font-black mb-1 tracking-tight">{item.name}</h3>
              <p className="text-xs text-gray-400 font-sans">{item.desc}</p>
            </div>

            {/* FOMO Stats Grid */}
            <div className="mt-auto border-t border-white/10 bg-white/5 p-4 grid grid-cols-3 gap-2">
              {item.stats.map((stat, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-[9px] text-gray-500 uppercase">
                    <stat.icon size={8} />
                    {stat.label}
                  </div>
                  <div className={`text-xs font-bold ${item.accent} font-mono`}>
                    {stat.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Decorative Corners */}
            <div className={`absolute top-0 left-0 w-1 h-1 border-t border-l ${item.disabled ? 'border-gray-600' : 'border-white'} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`absolute top-0 right-0 w-1 h-1 border-t border-r ${item.disabled ? 'border-gray-600' : 'border-white'} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`absolute bottom-0 left-0 w-1 h-1 border-b border-l ${item.disabled ? 'border-gray-600' : 'border-white'} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`absolute bottom-0 right-0 w-1 h-1 border-b border-r ${item.disabled ? 'border-gray-600' : 'border-white'} opacity-0 group-hover:opacity-100 transition-opacity`} />
          </CardWrapper>
        ))}
      </div>
    </div>
  )
}
