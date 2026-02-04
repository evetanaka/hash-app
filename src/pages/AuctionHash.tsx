import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useConnect } from 'wagmi';
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

interface Bid {
  id: number | string;
  bidder: string;
  amount: number;
  status: 'SAFE' | 'DANGER' | 'INVALID';
  time: string;
}

export const AuctionHash = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [jackpot, setJackpot] = useState(247832);
  const [userBid, setUserBid] = useState(1500);
  const [timeLeft, setTimeLeft] = useState({ d: 2, h: 14, m: 32, s: 18 });
  const [bids, setBids] = useState<Bid[]>([
    { id: 1, bidder: '0x7a3f...8e2d', amount: 2100, status: 'DANGER', time: '2m' },
    { id: 2, bidder: '0x91bc...4f7a', amount: 1500, status: 'SAFE', time: '15m' },
    { id: 3, bidder: '0x45de...9c1b', amount: 1420, status: 'SAFE', time: '1h' },
    { id: 4, bidder: '0x22aa...bb11', amount: 1250, status: 'SAFE', time: '3h' },
    { id: 5, bidder: '0x11cc...dd22', amount: 900, status: 'INVALID', time: '5h' },
  ]);

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

  const placeBid = () => {
    if (!isConnected) return;
    const truncatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'YOU';
    const newBid: Bid = {
      id: Math.random(),
      bidder: `YOU (${truncatedAddress})`,
      amount: userBid,
      status: userBid > 2000 ? 'DANGER' : 'SAFE',
      time: 'Just now'
    };
    setBids(prev => [newBid, ...prev]);
  };

  const isSafe = userBid >= 1200 && userBid <= 1950;
  const maxVisualizer = 3000;

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
              <span className="text-gray-500">PARTICIPANTS</span>
              <span>23</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">CONSENSUS</span>
              <span className="text-green-500">1,550 HASH</span>
            </div>
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
            ) : (
              <>
                <div className="mb-6">
                  <label className="text-xs text-gray-500 block mb-2">YOUR BID AMOUNT</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={userBid}
                      onChange={(e) => setUserBid(Number(e.target.value))}
                      className={`w-full bg-black border p-4 text-xl font-bold outline-none transition-colors ${isSafe ? 'border-green-500 text-green-500' : 'border-yellow-500 text-yellow-500'}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">HASH</span>
                  </div>
                  <div className={`text-[10px] mt-2 flex items-center gap-2 ${isSafe ? 'text-green-500' : 'text-yellow-500'}`}>
                    {isSafe ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}
                    SAFE ZONE: 1,200 — 1,950 HASH
                  </div>
                </div>
                <button
                  onClick={placeBid}
                  className="w-full border-2 border-white py-4 font-bold text-lg hover:bg-white hover:text-black transition-all active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [ PLACE BID ]
                </button>
              </>
            )}
          </div>

          {/* VISUALIZER */}
          <div className="border border-white/30 p-4 bg-black h-32 relative flex items-end pb-6 overflow-hidden">
            <div className="absolute top-2 left-2 text-[10px] text-gray-500">CONSENSUS VISUALIZER</div>
            {/* Safe Zone Highlight */}
            <div 
              className="absolute top-8 bottom-6 bg-green-500/10 border-x border-green-500/30"
              style={{ left: `${(1200/maxVisualizer)*100}%`, width: `${((1950-1200)/maxVisualizer)*100}%` }}
            />
            {/* Bids Dots */}
            {bids.map((bid, i) => (
              <div
                key={i}
                className={`absolute w-1.5 h-1.5 rounded-full bottom-8 ${
                  bid.status === 'SAFE' ? 'bg-green-500' : 
                  bid.status === 'DANGER' ? 'bg-red-500' : 'bg-gray-600'
                }`}
                style={{ left: `${(bid.amount / maxVisualizer) * 100}%` }}
              />
            ))}
            {/* User Marker */}
            <div 
              className="absolute bottom-6 transition-all duration-300"
              style={{ left: `${(userBid / maxVisualizer) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-cyan-500"></div>
            </div>
            {/* Axis Line */}
            <div className="absolute bottom-6 left-0 w-full h-px bg-gray-700"></div>
            <div className="absolute bottom-2 left-0 text-[9px] text-gray-600">0</div>
            <div className="absolute bottom-2 right-0 text-[9px] text-gray-600">{maxVisualizer}</div>
          </div>
        </div>
      </div>

      {/* LIVE BIDS TABLE */}
      <div className="border border-white/30 bg-black">
        <div className="flex justify-between p-3 border-b border-white/20 bg-white/5 items-center">
          <span className="text-xs font-bold">LIVE FEED</span>
          <button className="text-[10px] border border-gray-600 px-2 hover:bg-white hover:text-black">[FILTER ▼]</button>
        </div>
        <div className="grid grid-cols-12 text-[10px] text-gray-500 p-2 uppercase border-b border-gray-800">
          <div className="col-span-1">#</div>
          <div className="col-span-4">BIDDER</div>
          <div className="col-span-3">AMOUNT</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-2 text-right">TIME</div>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {bids.map((bid, i) => (
            <div 
              key={bid.id} 
              className={`grid grid-cols-12 text-xs p-3 border-b border-gray-800 items-center ${
                bid.bidder.includes('YOU') ? 'bg-cyan-900/20 text-cyan-400' : 'text-gray-300'
              }`}
            >
              <div className="col-span-1 text-gray-600">{i + 1}</div>
              <div className="col-span-4 font-mono">{bid.bidder}</div>
              <div className="col-span-3 font-bold">{bid.amount.toLocaleString()} HASH</div>
              <div className="col-span-2">
                <span className={`px-1.5 py-0.5 text-[9px] border ${
                  bid.status === 'SAFE' ? 'border-green-500 text-green-500' :
                  bid.status === 'DANGER' ? 'border-red-500 text-red-500' :
                  'border-gray-500 text-gray-500'
                }`}>
                  {bid.status}
                </span>
              </div>
              <div className="col-span-2 text-right text-gray-500">{bid.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuctionHash;
