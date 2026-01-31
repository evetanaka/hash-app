import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';

const App = () => {
  const [gameState, setGameState] = useState<'IDLE' | 'MINING' | 'RESULT'>('IDLE');
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [balance, setBalance] = useState(5000);
  const [jackpot, setJackpot] = useState(45230);
  const [lastHash, setLastHash] = useState('0x...');
  const [gameLog, setGameLog] = useState(['> SYSTEM READY...', '> CONNECTED TO NODE 192.168.0.1']);
  const [winningHex, setWinningHex] = useState<string | null>(null);
  const [blockHeight, setBlockHeight] = useState(19847523);

  const hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

  // Simulate Jackpot Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 10));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulate Block Height Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight(prev => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const addToLog = (msg: string) => {
    setGameLog(prev => [`> ${msg}`, ...prev].slice(0, 5));
  };

  const handleHexSelect = (char: string) => {
    if (gameState === 'MINING') return;
    setSelectedHex(char);
  };

  const placeBet = () => {
    if (!selectedHex || betAmount > balance || gameState === 'MINING') return;
    
    setBalance(prev => prev - betAmount);
    setGameState('MINING');
    setWinningHex(null);
    addToLog(`BROADCASTING TX... BET: ${betAmount} ON [${selectedHex.toUpperCase()}]`);

    // Simulate Mining Delay
    let miningTicks = 0;
    const miningInterval = setInterval(() => {
      miningTicks++;
      const randomChar = hexChars[Math.floor(Math.random() * hexChars.length)];
      setLastHash(`MINING... ${randomChar.toUpperCase()}${Math.random().toString(16).substr(2, 10)}...`);
      
      if (miningTicks > 20) {
        clearInterval(miningInterval);
        resolveGame();
      }
    }, 100);
  };

  const resolveGame = () => {
    const resultChar = hexChars[Math.floor(Math.random() * hexChars.length)];
    const generatedHash = `0x${Math.random().toString(16).substr(2, 32)}${resultChar}`;
    
    setLastHash(generatedHash);
    setWinningHex(resultChar);
    setGameState('RESULT');

    if (resultChar === selectedHex) {
      const winAmount = betAmount * 15;
      setBalance(prev => prev + winAmount);
      addToLog(`BLOCK CONFIRMED. WINNER! PAYOUT: ${winAmount} $HASH`);
    } else {
      addToLog(`BLOCK CONFIRMED. RESULT: [${resultChar.toUpperCase()}]. YOU LOST.`);
    }

    setTimeout(() => {
      setGameState('IDLE');
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-white selection:text-black overflow-x-hidden relative">
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 w-full h-full opacity-10" 
           style={{
             background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
             backgroundSize: '100% 2px, 3px 100%'
           }} 
      />
      
      {/* Flickering overlay for ambience */}
      <div className="pointer-events-none fixed inset-0 z-40 bg-white opacity-[0.02] animate-pulse"></div>

      <div className="relative z-10 container mx-auto max-w-4xl p-4 flex flex-col gap-6">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-white/20 pb-6">
          <div className="whitespace-pre text-xs md:text-sm leading-none tracking-tighter opacity-90 select-none">
{`██╗  ██╗ █████╗ ███████╗██╗  ██╗
██║  ██║██╔══██╗██╔════╝██║  ██║
███████║███████║███████╗███████║
██╔══██║██╔══██║╚════██║██╔══██║
██║  ██║██║  ██║███████║██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`}
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col items-end gap-2 w-full md:w-auto">
            <nav className="flex gap-4 text-sm">
              {['PLAY', 'STAKE', 'REF', 'HISTORY'].map(item => (
                <button key={item} className="hover:bg-white hover:text-black px-1 transition-colors duration-75 text-gray-400 hover:decoration-double">
                  [{item}]
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2 border border-white px-3 py-1 font-bold text-sm bg-black group hover:bg-white hover:text-black cursor-pointer transition-colors">
              <Wallet size={14} />
              <span>0x7F...3A92</span>
            </div>
          </div>
        </header>

        {/* JACKPOT BANNER */}
        <div className="w-full overflow-hidden border-y border-white/30 py-2 bg-white/5">
          <div className="animate-marquee whitespace-nowrap font-bold tracking-widest text-sm md:text-base">
            ░░░ JACKPOT: {jackpot.toLocaleString()} $HASH ░░░ 5 WINS TO CLAIM ░░░ CURRENT DIFFICULTY: 45.2G ░░░
          </div>
        </div>

        {/* MAIN GAME AREA */}
        <main className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          
          {/* LEFT: BETTING CONTROLS */}
          <div className="md:col-span-7 flex flex-col gap-6">
            
            {/* TABS */}
            <div className="flex text-sm border-b border-white/20">
              <button className="px-4 py-2 bg-white text-black font-bold border-t border-x border-white">
                ┌─ MANUAL ─┐
              </button>
              <button className="px-4 py-2 text-gray-500 hover:text-white border-t border-x border-transparent hover:border-white/20">
                AUTO
              </button>
            </div>

            {/* HEX GRID */}
            <div className="bg-black border border-white p-4 relative">
               <div className="absolute top-0 left-2 -mt-2 bg-black px-2 text-xs text-gray-400">SELECT DIGIT</div>
               <div className="grid grid-cols-4 gap-3">
                {hexChars.map((char) => (
                  <button
                    key={char}
                    onClick={() => handleHexSelect(char)}
                    disabled={gameState === 'MINING'}
                    className={`
                      aspect-square flex items-center justify-center text-xl font-bold border relative transition-all duration-75 group
                      ${selectedHex === char 
                        ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-105 z-10' 
                        : 'bg-black text-white border-gray-700 hover:border-white hover:text-white'
                      }
                      ${gameState === 'MINING' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {char.toUpperCase()}
                    {/* Corner accents */}
                    <span className="absolute top-0 left-0 w-1 h-1 border-t border-l border-current opacity-50"></span>
                    <span className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-current opacity-50"></span>
                  </button>
                ))}
               </div>
            </div>

            {/* BET INPUT & ACTION */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-gray-400 uppercase">
                <span>Balance: {balance} $HASH</span>
                <span>Win Chance: 6.25%</span>
              </div>
              <div className="flex gap-4">
                <div className="relative flex-grow group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-black border border-white py-3 pl-8 pr-4 font-mono text-lg focus:outline-none focus:ring-1 focus:ring-white group-hover:border-gray-300"
                  />
                  {/* ASCII Decorative frame elements */}
                  <div className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 border-t border-r border-white"></div>
                  <div className="absolute bottom-0 left-0 -mb-1 -ml-1 w-2 h-2 border-b border-l border-white"></div>
                </div>
                <button 
                  onClick={placeBet}
                  disabled={!selectedHex || gameState === 'MINING'}
                  className={`
                    px-6 py-3 font-bold border border-white transition-all duration-100 uppercase tracking-wider relative overflow-hidden
                    ${!selectedHex || gameState === 'MINING' 
                      ? 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-800' 
                      : 'bg-black text-white hover:bg-white hover:text-black active:translate-y-1'
                    }
                  `}
                >
                  {gameState === 'MINING' ? 'MINING...' : 'PLACE BET'}
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT: STATUS & LOGS */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* GAME STATUS SCREEN */}
            <div className="border border-white/50 bg-black min-h-[200px] p-1 flex flex-col relative overflow-hidden">
              {/* Scanline overlay specific to screen */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)50%,rgba(0,0,0,0.1)50%)] bg-[length:100%_4px] pointer-events-none z-20"></div>
              
              <div className="border border-white/20 h-full p-4 flex flex-col items-center justify-center relative">
                
                {gameState === 'IDLE' && (
                   <div className="text-center animate-pulse">
                     <div className="text-4xl mb-2">🎲</div>
                     <div className="text-sm text-gray-400">WAITING FOR INPUT</div>
                     <div className="mt-4 text-xs border border-gray-600 px-2 py-1 inline-block">BLOCK #{blockHeight}</div>
                   </div>
                )}

                {gameState === 'MINING' && (
                  <div className="w-full text-center">
                    <div className="text-xs text-left mb-2 text-gray-500">HASHING...</div>
                    <div className="font-mono text-2xl break-all leading-none opacity-80 blur-[0.5px]">
                      {lastHash.substring(0, 16)}<br/>
                      {lastHash.substring(16, 32)}
                    </div>
                    <div className="mt-4 flex justify-center gap-1">
                       <span className="w-2 h-4 bg-white animate-bounce"></span>
                       <span className="w-2 h-4 bg-white animate-bounce delay-75"></span>
                       <span className="w-2 h-4 bg-white animate-bounce delay-150"></span>
                    </div>
                  </div>
                )}

                {gameState === 'RESULT' && winningHex && (
                  <div className="w-full text-center relative z-30">
                     {winningHex === selectedHex ? (
                       <div className="animate-pulse">
                         <div className="text-4xl font-black mb-2 glitch-text">WINNER</div>
                         <div className="text-xl">+{betAmount * 15} $HASH</div>
                         <div className="mt-2 text-xs">BLOCK VALIDATED</div>
                       </div>
                     ) : (
                       <div>
                         <div className="text-4xl font-black mb-2 text-gray-500">WASTED</div>
                         <div className="text-sm">TARGET: {winningHex.toUpperCase()}</div>
                         <div className="text-sm">YOURS: {selectedHex?.toUpperCase()}</div>
                       </div>
                     )}
                  </div>
                )}
                
              </div>
            </div>

            {/* CONSOLE LOG */}
            <div className="bg-black border border-white/30 p-3 font-mono text-xs h-40 overflow-hidden flex flex-col justify-end">
              <div className="text-gray-500 mb-2 border-b border-gray-800 pb-1">TERMINAL_OUTPUT_V1.0</div>
              {gameLog.map((log, i) => (
                <div key={i} className={`mb-1 ${i === 0 ? 'text-white' : 'text-gray-500'}`}>
                  {log}
                </div>
              ))}
              <div className="animate-pulse">_</div>
            </div>

            {/* LIVE STATS */}
            <div className="grid grid-cols-2 gap-2 text-xs">
               <div className="border border-white/20 p-2">
                 <div className="text-gray-500">NET_HASH_RATE</div>
                 <div>445.2 EH/s</div>
               </div>
               <div className="border border-white/20 p-2">
                 <div className="text-gray-500">RECENT_WINS</div>
                 <div>0x3A...9F22</div>
               </div>
            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-white/20 pt-6 pb-10 text-center flex flex-col items-center gap-4">
          <p className="text-xl tracking-[0.2em] font-bold glitch-text">PREDICT THE BLOCK. WIN THE HASH.</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-white hover:underline">[DOCS]</a>
            <a href="#" className="hover:text-white hover:underline">[TWITTER]</a>
            <a href="#" className="hover:text-white hover:underline">[DISCORD]</a>
          </div>
          <p className="text-[10px] text-gray-700 mt-4 max-w-md">
            DISCLAIMER: GAMBLING WITH $HASH IS UNREGULATED. IF YOU LOSE YOUR PRIVATE KEYS IN THE MATRIX, WE CANNOT HELP YOU. PLAY RESPONSIBLY.
          </p>
        </footer>

      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .glitch-text {
          text-shadow: 2px 0 #fff, -2px 0 #333;
        }
        .delay-75 {
          animation-delay: 75ms;
        }
        .delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  );
};

export default App;
