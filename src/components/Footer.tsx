export function Footer() {
  return (
    <footer className="mt-8 border-t border-white/20 pt-6 pb-10 text-center flex flex-col items-center gap-4">
      <p className="text-xl tracking-[0.2em] font-bold">PREDICT THE BLOCK. WIN THE HASH.</p>
      <div className="flex gap-6 text-xs text-gray-500">
        <a href="#" className="hover:text-white hover:underline">[DOCS]</a>
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">[TWITTER]</a>
        <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">[DISCORD]</a>
      </div>
      <p className="text-[10px] text-gray-700 mt-4 max-w-md">
        DISCLAIMER: GAMBLING WITH $HASH IS UNREGULATED. PLAY RESPONSIBLY. SEPOLIA TESTNET ONLY.
      </p>
    </footer>
  )
}
