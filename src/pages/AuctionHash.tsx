import { useState, useEffect, useRef, useMemo } from 'react';
import { AlertTriangle, Lock, Eye, Loader2 } from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEther } from 'viem';
import { useAuctionHashSealed, BUCKETS, getBucketForAmount, formatAmount as formatAuctionAmount, formatCountdown } from '../hooks/useAuctionHashSealed';
import { useHashToken } from '../hooks/useHashToken';

// --- UTILS ---
const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef<() => void>(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current?.(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// Mock data for when contract is not deployed
const MOCK_BUCKET_COUNTS = [2, 5, 11, 4, 1, 0];
const MOCK_JACKPOT = 247832n * 10n**18n;

export const AuctionHash = () => {
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const { balance, hasGameApproval, approveGame, isApproving, isApproveConfirming } = useHashToken();
  const needsApproval = !hasGameApproval; // Use game approval for now
  
  const {
    auction,
    bucketCounts: realBucketCounts,
    timeRemaining: realTimeRemaining,
    isInRevealPhase,
    hasBid,
    maxGapPercent,
    losersRefundPercent,
    minBid,
    bidAmount,
    setBidAmount,
    bidAmountBigInt,
    placeBid,
    revealBid,
    isPlacingBid,
    isPlaceBidConfirming,
    isRevealingBid,
    isRevealConfirming,
    isContractDeployed
  } = useAuctionHashSealed();

  // Use mock data when contract not deployed
  const bucketCounts = isContractDeployed ? realBucketCounts : MOCK_BUCKET_COUNTS;
  const jackpot = isContractDeployed ? (auction?.jackpot ?? 0n) : MOCK_JACKPOT;
  
  // Local state for demo mode
  const [mockTimeLeft, setMockTimeLeft] = useState({ d: 2, h: 14, m: 32, s: 18 });
  const [localBucketCounts, setLocalBucketCounts] = useState(MOCK_BUCKET_COUNTS);
  const [hasPlacedBid, setHasPlacedBid] = useState(false);
  const [localJackpot, setLocalJackpot] = useState(247832);

  // Use real or mock time
  const timeLeft = useMemo(() => {
    if (isContractDeployed && realTimeRemaining > 0) {
      return formatCountdown(realTimeRemaining);
    }
    return mockTimeLeft;
  }, [isContractDeployed, realTimeRemaining, mockTimeLeft]);

  // Mock timer tick
  useInterval(() => {
    if (!isContractDeployed) {
      setLocalJackpot(prev => prev + Math.floor(Math.random() * 5));
      setMockTimeLeft(prev => {
        let { d, h, m, s } = prev;
        if (s > 0) s--;
        else {
          s = 59;
          if (m > 0) m--;
          else {
            m = 59;
            if (h > 0) h--;
            else {
              h = 23;
              if (d > 0) d--;
            }
          }
        }
        return { d, h, m, s };
      });
    }
  }, 1000);

  const displayBucketCounts = isContractDeployed ? bucketCounts : localBucketCounts;
  const displayTotalBids = displayBucketCounts.reduce((a, b) => a + b, 0);
  const displayJackpot = isContractDeployed ? Number(jackpot / 10n**18n) : localJackpot;
  
  const userBucket = getBucketForAmount(Number(bidAmount) || 0);
  const isValidBid = bidAmountBigInt >= minBid;
  const hotZoneBucket = displayBucketCounts.indexOf(Math.max(...displayBucketCounts));
  
  const bidDisplayed = hasBid || hasPlacedBid;

  const handlePlaceBid = async () => {
    if (!isConnected || !isValidBid) return;
    
    if (isContractDeployed) {
      // Real contract interaction
      await placeBid(bidAmountBigInt, bidAmountBigInt);
    } else {
      // Mock for demo
      const newCounts = [...localBucketCounts];
      newCounts[userBucket]++;
      setLocalBucketCounts(newCounts);
      setHasPlacedBid(true);
    }
  };

  const handleApprove = () => {
    approveGame(parseEther('1000000000'));
  };

  const isProcessing = isPlacingBid || isPlaceBidConfirming || isApproving || isApproveConfirming;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 font-mono">
      {/* Demo mode banner */}
      {!isContractDeployed && (
        <div className="bg-blue-500/20 border border-blue-500/50 p-3 text-center text-xs">
          🎮 DEMO MODE — Contract not yet deployed. UI is functional with mock data.
        </div>
      )}

      {/* HERO JACKPOT */}
      <div className="border-y-4 border-double border-white/40 py-6 text-center relative bg-white/5 group overflow-hidden">
        <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors"></div>
        <div className="text-gray-400 text-xs tracking-widest mb-2">CURRENT AUCTION POOL</div>
        <div className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
          ◆ {displayJackpot.toLocaleString()} HASH ◆
        </div>
        <div className="text-gray-500 mt-2 text-sm">≈ ${(displayJackpot * 0.05).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</div>
        <div className="absolute bottom-0 left-0 h-1 bg-purple-900 w-full">
          <div className="h-full bg-purple-500 w-[68%] shadow-[0_0_10px_#a855f7]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT COL */}
        <div className="md:col-span-5 flex flex-col gap-6">
          {/* COUNTDOWN */}
          <div className="border border-white/30 p-4 bg-black">
            <div className="text-xs text-gray-500 mb-4 border-b border-gray-800 pb-2">
              {isInRevealPhase ? 'REVEAL PHASE' : 'REVEAL IN'}
            </div>
            <div className="flex justify-between text-2xl md:text-3xl font-bold text-white mb-2">
              <div className="border border-white/20 p-2 min-w-[3ch] text-center">{timeLeft.d}D</div>
              <div className="self-center animate-pulse">:</div>
              <div className="border border-white/20 p-2 min-w-[3ch] text-center">{timeLeft.h.toString().padStart(2,'0')}</div>
              <div className="self-center animate-pulse">:</div>
              <div className="border border-white/20 p-2 min-w-[3ch] text-center">{timeLeft.m.toString().padStart(2,'0')}</div>
              <div className="self-center animate-pulse">:</div>
              <div className="border border-white/20 p-2 min-w-[3ch] text-center text-red-500">{timeLeft.s.toString().padStart(2,'0')}</div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">Sunday 20:00 UTC</div>
          </div>
          
          {/* STATS */}
          <div className="border border-white/30 p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">AUCTION #</span>
              <span>{isContractDeployed ? auction?.auctionId?.toString() : '47'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">SEALED BIDS</span>
              <span>{displayTotalBids}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">MAX GAP RULE</span>
              <span className="text-yellow-500">{maxGapPercent}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">LOSER REFUND</span>
              <span className="text-green-500">{losersRefundPercent}%</span>
            </div>
          </div>

          {/* SEALED BID INFO */}
          <div className="border border-yellow-500/30 bg-yellow-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={14} className="text-yellow-500" />
              <span className="text-xs font-bold text-yellow-500">SEALED BID AUCTION</span>
            </div>
            <p className="text-xs text-gray-400">
              Exact bid amounts are hidden until Sunday 20:00 UTC. Only bucket distribution is visible via the heatmap.
            </p>
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="md:col-span-7 flex flex-col gap-6">
          {/* BID PANEL */}
          <div className="border border-white/30 p-6 bg-black relative">
            <div className="absolute top-0 right-0 bg-white text-black text-[10px] px-2 font-bold">
              {isInRevealPhase ? 'REVEAL PHASE' : 'BIDDING OPEN'}
            </div>
            
            {!isConnected ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">CONNECT WALLET TO BID</div>
                <button 
                  onClick={() => connect({ connector: injected() })}
                  className="border-2 border-white px-6 py-3 font-bold hover:bg-white hover:text-black transition-all"
                >
                  [ CONNECT WALLET ]
                </button>
              </div>
            ) : isInRevealPhase ? (
              <div className="text-center py-6">
                <div className="text-yellow-500 text-4xl mb-3">⏰</div>
                <div className="text-yellow-500 font-bold mb-2">REVEAL PHASE</div>
                <p className="text-gray-400 text-sm mb-4">
                  Bidding is closed. Reveal your bid to participate in winner determination.
                </p>
                {bidDisplayed && (
                  <button
                    onClick={revealBid}
                    disabled={isRevealingBid || isRevealConfirming}
                    className="border-2 border-yellow-500 text-yellow-500 px-6 py-3 font-bold hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
                  >
                    {(isRevealingBid || isRevealConfirming) ? (
                      <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> REVEALING...</span>
                    ) : '[ REVEAL YOUR BID ]'}
                  </button>
                )}
              </div>
            ) : bidDisplayed ? (
              <div className="text-center py-6">
                <div className="text-green-500 text-4xl mb-3">✓</div>
                <div className="text-green-500 font-bold mb-2">BID PLACED</div>
                <div className="text-gray-400 text-sm mb-4">
                  Your sealed bid of <span className="text-white font-bold">{Number(bidAmount).toLocaleString()} HASH</span> is locked.
                </div>
                <div className="border border-gray-700 p-3 text-xs text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Eye size={12} />
                    Your bid is in bucket [{BUCKETS[userBucket].label}]
                  </div>
                  <div className="mt-1">Exact amount hidden until reveal</div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="text-xs text-gray-500 block mb-2">YOUR BID AMOUNT</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Min: ${formatAuctionAmount(minBid)}`}
                      disabled={isProcessing}
                      className={`w-full bg-black border p-4 text-xl font-bold outline-none transition-colors ${isValidBid || !bidAmount ? 'border-white text-white' : 'border-red-500 text-red-500'}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">HASH</span>
                  </div>
                  
                  {/* Bucket indicator */}
                  {bidAmount && (
                    <div className="mt-3 p-3 border border-gray-700 bg-gray-900/50">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">📊 Your bucket:</span>
                        <span className={`font-bold ${userBucket === hotZoneBucket ? 'text-orange-400' : 'text-cyan-400'}`}>
                          [{BUCKETS[userBucket].label}]
                        </span>
                        {userBucket === hotZoneBucket && (
                          <span className="text-orange-400 text-[10px]">🔥 HOT ZONE</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <Lock size={10} />
                        Exact amount stays hidden until reveal
                      </div>
                    </div>
                  )}
                  
                  {bidAmount && !isValidBid && (
                    <div className="text-[10px] mt-2 flex items-center gap-2 text-red-500">
                      <AlertTriangle size={12}/>
                      Minimum bid is {formatAuctionAmount(minBid)} HASH
                    </div>
                  )}

                  {/* Balance info */}
                  <div className="text-xs text-gray-500 mt-2">
                    Balance: {formatAuctionAmount(balance)} HASH
                  </div>
                </div>

                {/* Approval button if needed */}
                {needsApproval && balance > 0n && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || isApproveConfirming}
                    className="w-full border-2 border-blue-500 text-blue-500 py-3 font-bold mb-3 hover:bg-blue-500 hover:text-black transition-all disabled:opacity-50"
                  >
                    {(isApproving || isApproveConfirming) ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> APPROVING...</span>
                    ) : '[ APPROVE HASH ]'}
                  </button>
                )}

                <button
                  onClick={handlePlaceBid}
                  disabled={!isValidBid || isProcessing || (isContractDeployed && needsApproval)}
                  className="w-full border-2 border-white py-4 font-bold text-lg hover:bg-white hover:text-black transition-all active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> PLACING BID...</span>
                  ) : '[ PLACE SEALED BID ]'}
                </button>

                {/* Quick amounts */}
                <div className="flex gap-2 mt-3">
                  {[100, 500, 1000, 2500, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBidAmount(amt.toString())}
                      disabled={isProcessing}
                      className="flex-1 py-1 text-xs border border-gray-700 text-gray-500 hover:border-white hover:text-white transition-colors"
                    >
                      {amt >= 1000 ? `${amt/1000}K` : amt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* HEATMAP */}
          <div className="border border-white/30 p-4 bg-black">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs text-gray-500">CONSENSUS HEATMAP</div>
              <div className="text-xs text-gray-400">{displayTotalBids} bidders</div>
            </div>
            
            <div className="space-y-2">
              {BUCKETS.map((bucket, i) => {
                const count = displayBucketCounts[i];
                const percentage = displayTotalBids > 0 ? (count / displayTotalBids) * 100 : 0;
                const isHotZone = i === hotZoneBucket && count > 0;
                const isUserBucket = i === userBucket && bidDisplayed;
                
                return (
                  <div key={bucket.id} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-gray-500 text-right">[{bucket.label}]</div>
                    <div className="flex-1 h-6 bg-gray-900 relative overflow-hidden border border-gray-800">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isHotZone ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                          count > 0 ? 'bg-gradient-to-r from-green-900 to-green-700' : ''
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                      {isUserBucket && (
                        <div className="absolute inset-0 border-2 border-cyan-500 flex items-center justify-end pr-2">
                          <span className="text-[9px] text-cyan-400">← YOU</span>
                        </div>
                      )}
                    </div>
                    <div className="w-12 text-xs text-right">
                      {count > 0 ? (
                        <span className={isHotZone ? 'text-orange-400' : 'text-gray-400'}>
                          {percentage.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-800 text-[10px] text-gray-500">
              💡 Most competition in [{BUCKETS[hotZoneBucket].label}] range • Exact amounts hidden
            </div>
          </div>
        </div>
      </div>

      {/* RULES */}
      <div className="border border-white/20 p-4 bg-black/50 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-xs text-gray-500">WINNER</div>
          <div className="text-sm">Highest valid bid</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-xs text-gray-500">CONSENSUS RULE</div>
          <div className="text-sm">Max {maxGapPercent}% gap to #2</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-xs text-gray-500">IF YOU LOSE</div>
          <div className="text-sm">Get {losersRefundPercent}% back</div>
        </div>
      </div>
    </div>
  );
};

export default AuctionHash;
