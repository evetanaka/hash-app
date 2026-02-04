import { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useAuctionHash, formatCountdown, formatAmount } from '../hooks/useAuctionHash'
import { useHashToken } from '../hooks/useHashToken'
import { GetHashCTA } from '../components/GetHashCTA'

// Format address for display
function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Danger zone indicator component
function DangerIndicator({ gapPercent, maxGap }: { gapPercent: number; maxGap: number }) {
  if (gapPercent <= maxGap * 0.5) {
    return <span className="text-green-400 text-xs">✓ SAFE</span>
  }
  if (gapPercent <= maxGap) {
    return <span className="text-yellow-400 text-xs">⚠ {gapPercent.toFixed(1)}%</span>
  }
  return (
    <span className="text-red-500 text-xs font-bold animate-pulse">
      ✗ INVALID ({gapPercent.toFixed(1)}%)
    </span>
  )
}

export function AuctionPage() {
  const { isConnected, address } = useAccount()
  const { balance } = useHashToken()
  const {
    auction,
    bids,
    userBid,
    safeZone,
    pendingClaim,
    history,
    maxGapPercent,
    minBid,
    losersRefundPercent,
    needsApproval,
    timeRemaining,
    isAuctionActive,
    canReveal,
    bidAmount,
    setBidAmount,
    bidAmountBigInt,
    approve,
    placeBid,
    claimWinnings,
    claimRefund,
    reveal,
    isApproving,
    isApproveConfirming,
    isBidding,
    isBidConfirming,
    isClaimingWinnings,
    isClaimWinningsConfirming,
    isClaimingRefund,
    isClaimRefundConfirming,
    isRevealing,
    isRevealConfirming,
    contractAddress,
  } = useAuctionHash()

  const [countdown, setCountdown] = useState(timeRemaining)
  const [showHistory, setShowHistory] = useState(false)

  // Update countdown every second
  useEffect(() => {
    setCountdown(timeRemaining)
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [timeRemaining])

  // Calculate safe zone display
  const safeZoneDisplay = useMemo(() => {
    if (!safeZone) return null
    
    const min = formatAmount(safeZone.minSafeAmount)
    const max = safeZone.maxSafeAmount > parseEther('1000000000') 
      ? '∞' 
      : formatAmount(safeZone.maxSafeAmount)
    
    return { min, max, isValid: safeZone.isValid }
  }, [safeZone])

  // Check if user's bid is the top bid
  const userBidRank = useMemo(() => {
    if (!address || userBid === 0n) return null
    const rank = bids.findIndex(b => b.bidder.toLowerCase() === address.toLowerCase())
    return rank >= 0 ? rank + 1 : null
  }, [bids, address, userBid])

  // User's bid entry
  const userBidEntry = useMemo(() => {
    if (!address || userBid === 0n) return null
    return bids.find(b => b.bidder.toLowerCase() === address.toLowerCase())
  }, [bids, address, userBid])

  const isProcessing = isBidding || isBidConfirming || isApproving || isApproveConfirming

  // Validation
  const betAmountBigInt = bidAmountBigInt
  const isBelowMin = betAmountBigInt > 0n && betAmountBigInt < minBid
  const isAboveBalance = betAmountBigInt > balance
  const isInDangerZone = safeZone && !safeZone.isValid

  const canPlaceBid = isConnected && 
    isAuctionActive && 
    betAmountBigInt > 0n && 
    !isBelowMin && 
    !isAboveBalance && 
    !needsApproval &&
    !isProcessing

  const handleBid = () => {
    if (!canPlaceBid) return
    placeBid(betAmountBigInt)
  }

  const handleApprove = () => {
    approve(parseEther('1000000000')) // Large approval
  }

  // Contract not deployed check
  if (contractAddress === '0x0000000000000000000000000000000000000000') {
    return (
      <main className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🔨</div>
        <h1 className="text-2xl font-bold mb-2">COMING SOON</h1>
        <p className="text-gray-500 text-center max-w-md">
          Auction Hash is currently in development. Check back soon for the ultimate consensus-based auction game!
        </p>
      </main>
    )
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
      
      {/* LEFT: AUCTION INFO & BID FORM */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        <GetHashCTA />
        
        {/* AUCTION HEADER */}
        <div className="border border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-transparent p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">AUCTION HASH</h1>
              <p className="text-gray-500 text-sm mt-1">
                Highest bid wins — unless you overbid too much
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase">Auction #{auction?.auctionId?.toString() || '?'}</div>
              <div className="text-xs text-gray-600">
                {auction?.revealed ? 'COMPLETED' : isAuctionActive ? 'ACTIVE' : 'PENDING'}
              </div>
            </div>
          </div>
          
          {/* JACKPOT DISPLAY */}
          <div className="bg-black border border-yellow-500 p-4 text-center">
            <div className="text-xs text-gray-500 uppercase mb-1">Current Jackpot</div>
            <div className="text-4xl font-black text-yellow-400" style={{textShadow: '0 0 20px rgba(234,179,8,0.5)'}}>
              {auction ? formatAmount(auction.jackpot, 0) : '0'} <span className="text-xl">$HASH</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Winner takes all
            </div>
          </div>

          {/* COUNTDOWN */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500 uppercase">
              {auction?.revealed ? 'AUCTION ENDED' : canReveal ? 'READY TO REVEAL' : 'Time Remaining'}
            </div>
            <div className="text-3xl font-mono font-bold mt-1">
              {auction?.revealed ? (
                <span className="text-green-400">WINNER: {auction.winner ? formatAddress(auction.winner) : 'NONE'}</span>
              ) : canReveal ? (
                <button
                  onClick={reveal}
                  disabled={isRevealing || isRevealConfirming}
                  className="px-6 py-2 bg-green-500 text-black font-bold hover:bg-green-400 transition-colors"
                >
                  {isRevealing || isRevealConfirming ? 'REVEALING...' : '🎉 REVEAL WINNER'}
                </button>
              ) : (
                formatCountdown(countdown)
              )}
            </div>
          </div>
        </div>

        {/* CONSENSUS RULE INFO */}
        <div className="border border-white/20 p-4 bg-black/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📋</span>
            <h3 className="font-bold">CONSENSUS RULE</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border border-gray-800 p-3">
              <div className="text-gray-500 text-xs mb-1">MAX GAP ALLOWED</div>
              <div className="text-xl font-bold text-yellow-400">{maxGapPercent}%</div>
              <div className="text-xs text-gray-600 mt-1">Between #1 and #2 bid</div>
            </div>
            <div className="border border-gray-800 p-3">
              <div className="text-gray-500 text-xs mb-1">LOSER REFUND</div>
              <div className="text-xl font-bold text-green-400">{losersRefundPercent}%</div>
              <div className="text-xs text-gray-600 mt-1">Get 90% back if you lose</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 If your bid is &gt;{maxGapPercent}% higher than the next bid, you're INVALID and get refunded.
            The cascade continues until a valid winner is found.
          </p>
        </div>

        {/* BID FORM */}
        {isConnected && isAuctionActive && (
          <div className="border border-white p-4 bg-black">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">🎯</span>
              PLACE YOUR BID
            </h3>

            {/* Safe Zone Calculator */}
            {safeZoneDisplay && bids.length > 0 && (
              <div className={`mb-4 p-3 border ${isInDangerZone ? 'border-red-500 bg-red-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500">SAFE ZONE</div>
                    <div className="font-mono">
                      {safeZoneDisplay.min} — {safeZoneDisplay.max} $HASH
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${isInDangerZone ? 'text-red-500' : 'text-green-400'}`}>
                    {isInDangerZone ? '⚠️ DANGER ZONE' : '✓ VALID BID'}
                  </div>
                </div>
              </div>
            )}

            {/* Your Current Bid */}
            {userBid > 0n && (
              <div className="mb-4 p-3 border border-blue-500/50 bg-blue-500/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500">YOUR CURRENT BID</div>
                    <div className="font-mono text-xl">{formatAmount(userBid)} $HASH</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">RANK</div>
                    <div className="text-xl font-bold">#{userBidRank || '?'}</div>
                    {userBidEntry && (
                      <DangerIndicator gapPercent={userBidEntry.gapPercent} maxGap={maxGapPercent} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Token Approval */}
            {needsApproval && balance > 0n && (
              <div className="mb-4">
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isApproveConfirming}
                  className="w-full py-3 bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {isApproving || isApproveConfirming ? 'APPROVING...' : '🔓 APPROVE $HASH'}
                </button>
              </div>
            )}

            {/* Bid Input */}
            <div className="flex gap-4">
              <div className="relative flex-grow">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min: ${formatAmount(minBid)}`}
                  disabled={isProcessing || needsApproval}
                  className={`w-full bg-black border py-3 pl-4 pr-20 font-mono text-lg focus:outline-none focus:ring-1 ${
                    (isBelowMin || isAboveBalance || isInDangerZone)
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-white focus:ring-white'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$HASH</span>
              </div>
              <button
                onClick={handleBid}
                disabled={!canPlaceBid}
                className={`
                  px-6 py-3 font-bold border transition-all duration-100 uppercase tracking-wider
                  ${!canPlaceBid
                    ? 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-800'
                    : isInDangerZone
                      ? 'bg-red-600 text-white border-red-500 hover:bg-red-500'
                      : 'bg-white text-black border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]'
                  }
                `}
              >
                {isBidding || isBidConfirming ? 'BIDDING...' : userBid > 0n ? 'INCREASE BID' : 'PLACE BID'}
              </button>
            </div>

            {/* Validation Errors */}
            {betAmountBigInt > 0n && (isBelowMin || isAboveBalance) && (
              <div className="text-xs text-red-400 mt-2">
                {isBelowMin && `⚠ Minimum bid is ${formatAmount(minBid)} $HASH`}
                {isAboveBalance && `⚠ Insufficient balance`}
              </div>
            )}

            {/* Warning for danger zone bid */}
            {isInDangerZone && betAmountBigInt > 0n && !isBelowMin && !isAboveBalance && (
              <div className="text-xs text-yellow-400 mt-2">
                ⚠️ This bid is in the DANGER ZONE! If no one bids between you and current top, you'll be invalidated.
              </div>
            )}

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-3">
              {[100, 500, 1000, 5000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBidAmount(amt.toString())}
                  disabled={isProcessing}
                  className="flex-1 py-1 text-xs border border-gray-700 text-gray-500 hover:border-white hover:text-white transition-colors"
                >
                  {amt}
                </button>
              ))}
              <button
                onClick={() => {
                  // Set to max of safe zone if available
                  if (safeZone && safeZone.maxSafeAmount < balance) {
                    setBidAmount(formatEther(safeZone.maxSafeAmount))
                  } else {
                    setBidAmount(formatEther(balance))
                  }
                }}
                disabled={isProcessing}
                className="flex-1 py-1 text-xs border border-gray-700 text-gray-500 hover:border-white hover:text-white transition-colors"
              >
                SAFE MAX
              </button>
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              Balance: {formatAmount(balance)} $HASH
            </div>
          </div>
        )}

        {/* PENDING CLAIM */}
        {pendingClaim.hasClaim && (
          <div className={`border p-4 ${pendingClaim.isWinner ? 'border-yellow-500 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500">
                  {pendingClaim.isWinner ? '🏆 YOU WON!' : '💰 REFUND AVAILABLE'}
                </div>
                <div className="text-2xl font-bold">
                  {formatAmount(pendingClaim.claimAmount)} $HASH
                </div>
              </div>
              <button
                onClick={() => pendingClaim.isWinner 
                  ? claimWinnings(auction!.auctionId - 1n)
                  : claimRefund(auction!.auctionId - 1n)
                }
                disabled={isClaimingWinnings || isClaimWinningsConfirming || isClaimingRefund || isClaimRefundConfirming}
                className={`px-6 py-3 font-bold ${
                  pendingClaim.isWinner 
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                    : 'bg-green-600 text-white hover:bg-green-500'
                } transition-colors`}
              >
                {(isClaimingWinnings || isClaimWinningsConfirming || isClaimingRefund || isClaimRefundConfirming)
                  ? 'CLAIMING...'
                  : 'CLAIM NOW'
                }
              </button>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT: BID LIST & HISTORY */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        
        {/* TAB TOGGLE */}
        <div className="flex border-b border-white/20">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-2 text-sm font-bold transition-colors ${
              !showHistory ? 'bg-white text-black' : 'text-gray-500 hover:text-white'
            }`}
          >
            LIVE BIDS ({auction?.totalBids?.toString() || '0'})
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 py-2 text-sm font-bold transition-colors ${
              showHistory ? 'bg-white text-black' : 'text-gray-500 hover:text-white'
            }`}
          >
            HISTORY
          </button>
        </div>

        {/* LIVE BIDS */}
        {!showHistory && (
          <div className="border border-white/30 bg-black overflow-hidden">
            <div className="bg-white/10 p-2 text-xs font-bold grid grid-cols-12 gap-2">
              <div className="col-span-1">#</div>
              <div className="col-span-5">BIDDER</div>
              <div className="col-span-3 text-right">AMOUNT</div>
              <div className="col-span-3 text-right">STATUS</div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {bids.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">🦗</div>
                  <div>No bids yet. Be the first!</div>
                </div>
              ) : (
                bids.map((bid, index) => {
                  const isUser = address && bid.bidder.toLowerCase() === address.toLowerCase()
                  return (
                    <div
                      key={bid.bidder}
                      className={`p-3 grid grid-cols-12 gap-2 border-b border-white/10 text-sm ${
                        isUser ? 'bg-blue-500/20' : bid.isInDangerZone ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <div className="col-span-1 font-bold text-gray-500">
                        {index + 1}
                      </div>
                      <div className="col-span-5 font-mono truncate">
                        {isUser ? (
                          <span className="text-blue-400">YOU</span>
                        ) : (
                          formatAddress(bid.bidder)
                        )}
                      </div>
                      <div className="col-span-3 text-right font-mono">
                        {formatAmount(bid.amount)}
                      </div>
                      <div className="col-span-3 text-right">
                        <DangerIndicator gapPercent={bid.gapPercent} maxGap={maxGapPercent} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {showHistory && (
          <div className="border border-white/30 bg-black overflow-hidden">
            <div className="bg-white/10 p-2 text-xs font-bold grid grid-cols-12 gap-2">
              <div className="col-span-2">#</div>
              <div className="col-span-4">WINNER</div>
              <div className="col-span-3 text-right">BID</div>
              <div className="col-span-3 text-right">JACKPOT</div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📜</div>
                  <div>No completed auctions yet</div>
                </div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.auctionId.toString()}
                    className="p-3 grid grid-cols-12 gap-2 border-b border-white/10 text-sm"
                  >
                    <div className="col-span-2 text-gray-500">
                      #{entry.auctionId.toString()}
                    </div>
                    <div className="col-span-4 font-mono truncate">
                      {entry.winner ? formatAddress(entry.winner) : '-'}
                    </div>
                    <div className="col-span-3 text-right font-mono">
                      {formatAmount(entry.winningBid)}
                    </div>
                    <div className="col-span-3 text-right font-mono text-yellow-400">
                      {formatAmount(entry.jackpot)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* GAME THEORY TIPS */}
        <div className="border border-gray-800 p-4 text-xs text-gray-500">
          <div className="font-bold text-white mb-2">💡 STRATEGY TIPS</div>
          <ul className="space-y-1">
            <li>• Don't overbid! Stay within {maxGapPercent}% of the 2nd highest</li>
            <li>• Late bids have more info, but less reaction time</li>
            <li>• Watch the "danger zone" — invalid bids get refunded</li>
            <li>• Even if you lose, you get {losersRefundPercent}% back</li>
          </ul>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="border border-white/20 p-3">
            <div className="text-gray-500">TOTAL BIDS</div>
            <div className="text-xl font-bold">{auction?.totalBids?.toString() || '0'}</div>
          </div>
          <div className="border border-white/20 p-3">
            <div className="text-gray-500">YOUR BID</div>
            <div className="text-xl font-bold">
              {userBid > 0n ? formatAmount(userBid) : '—'}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
