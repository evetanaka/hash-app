import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Lock, Eye } from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

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

// Bucket definitions
const BUCKETS = [
  { id: 0, label: '0-500', min: 0, max: 500 },
  { id: 1, label: '500-1k', min: 500, max: 1000 },
  { id: 2, label: '1k-2k', min: 1000, max: 2000 },
  { id: 3, label: '2k-5k', min: 2000, max: 5000 },
  { id: 4, label: '5k-10k', min: 5000, max: 10000 },
  { id: 5, label: '10k+', min: 10000, max: Infinity },
];

const getBucketForAmount = (amount: number): number => {
  for (let i = 0; i < BUCKETS.length; i++) {
    if (amount >= BUCKETS[i].min && amount < BUCKETS[i].max) {
      return i;
    }
  }
  return BUCKETS.length - 1;
};

export const AuctionHash = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  
  const [jackpot, setJackpot] = useState(247832);
  const [userBid, setUserBid] = useState(1500);
  const [timeLeft, setTimeLeft] = useState({ d: 2, h: 14, m: 32, s: 18 });
  const [hasPlacedBid, setHasPlacedBid] = useState(false);
  
  // Bucket counts for heatmap (mock data)
  const [bucketCounts, setBucketCounts] = useState([2, 5, 11, 4, 1, 0]);
  const totalBids = bucketCounts.reduce((a, b) => a + b, 0);

  useInterval(() => {
    // Tick Jackpot
    setJackpot(prev => prev + Math.floor(Math.random() * 5));
    // Tick Timer
    setTimeLeft(prev => {
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
  }, 1000);

  const userBucket = getBucketForAmount(userBid);
  const isValidBid = userBid >= 100;
  
  // Find the "hot zone" (bucket with most bids)
  const hotZoneBucket = bucketCounts.indexOf(Math.max(...bucketCounts));

  const placeBid = () => {
    if (!isConnected || !isValidBid) return;
    // Update bucket counts
    const newCounts = [...bucketCounts];
    newCounts[userBucket]++;
    setBucketCounts(newCounts);
    setHasPlacedBid(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 font-mono">
      {/* HERO JACKPOT */}
      <div className="border-y-4 border-double border-white/40 py-6 text-center relative bg-white/5 group overflow-hidden">
        <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors"></div>
        <div className="text-gray-400 text-xs tracking-widest mb-2">CURRENT AUCTION POOL</div>
        <div className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
          ◆ {jackpot.toLocaleString()} HASH ◆
        </div>
        <div className="text-gray-500 mt-2 text-sm">≈ ${(jackpot * 0.05).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</div>
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-purple-900 w-full">
          <div className="h-full bg-purple-500 w-[68%] shadow-[0_0_10px_#a855f7]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT COL: TIMER & STATS */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="border border-white/30 p-4 bg-black">
            <div className="text-xs text-gray-500 mb-4 border-b border-gray-800 pb-2">REVEAL IN</div>
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
          
          <div className="border border-white/30 p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">AUCTION #</span>
              <span>47</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">SEALED BIDS</span>
              <span>{totalBids}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">MAX GAP RULE</span>
              <span className="text-yellow-500">30%</span>
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

        {/* RIGHT COL: BIDDING */}
        <div className="md:col-span-7 flex flex-col gap-6">
          {/* BID PANEL */}
          <div className="border border-white/30 p-6 bg-black relative">
            <div className="absolute top-0 right-0 bg-white text-black text-[10px] px-2 font-bold">BIDDING OPEN</div>
            
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
            ) : hasPlacedBid ? (
              <div className="text-center py-6">
                <div className="text-green-500 text-4xl mb-3">✓</div>
                <div className="text-green-500 font-bold mb-2">BID PLACED</div>
                <div className="text-gray-400 text-sm mb-4">
                  Your sealed bid of <span className="text-white font-bold">{userBid.toLocaleString()} HASH</span> is locked.
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
                      value={userBid}
                      onChange={(e) => setUserBid(Number(e.target.value))}
                      className={`w-full bg-black border p-4 text-xl font-bold outline-none transition-colors ${isValidBid ? 'border-white text-white' : 'border-red-500 text-red-500'}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">HASH</span>
                  </div>
                  
                  {/* Bucket indicator */}
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
                  
                  {!isValidBid && (
                    <div className="text-[10px] mt-2 flex items-center gap-2 text-red-500">
                      <AlertTriangle size={12}/>
                      Minimum bid is 100 HASH
                    </div>
                  )}
                </div>
                <button
                  onClick={placeBid}
                  disabled={!isValidBid}
                  className="w-full border-2 border-white py-4 font-bold text-lg hover:bg-white hover:text-black transition-all active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [ PLACE SEALED BID ]
                </button>
              </>
            )}
          </div>

          {/* HEATMAP */}
          <div className="border border-white/30 p-4 bg-black">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs text-gray-500">CONSENSUS HEATMAP</div>
              <div className="text-xs text-gray-400">{totalBids} bidders</div>
            </div>
            
            <div className="space-y-2">
              {BUCKETS.map((bucket, i) => {
                const count = bucketCounts[i];
                const percentage = totalBids > 0 ? (count / totalBids) * 100 : 0;
                const isHotZone = i === hotZoneBucket && count > 0;
                const isUserBucket = i === userBucket && hasPlacedBid;
                
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

      {/* RULES SUMMARY */}
      <div className="border border-white/20 p-4 bg-black/50 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-xs text-gray-500">WINNER</div>
          <div className="text-sm">Highest valid bid</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-xs text-gray-500">CONSENSUS RULE</div>
          <div className="text-sm">Max 30% gap to #2</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-xs text-gray-500">IF YOU LOSE</div>
          <div className="text-sm">Get 90% back</div>
        </div>
      </div>
    </div>
  );
};

export default AuctionHash;
