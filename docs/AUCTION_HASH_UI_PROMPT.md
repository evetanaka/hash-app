# Auction Hash — UI/UX Design Prompt for Gemini

## Context

Design the user interface for **Auction Hash**, a weekly crypto auction game. This is part of the **Hash Game** ecosystem — a Web3 gambling platform with a **cyberpunk brutalist** aesthetic.

---

## Visual Identity (MUST MATCH EXISTING)

### Color Palette
```
Background:      #0a0a0a (near-black)
Surface:         #111111 (cards, modals)
Border:          rgba(255, 255, 255, 0.3) (white with opacity)
Border Hover:    rgba(255, 255, 255, 0.5)
Text Primary:    #FFFFFF
Text Secondary:  #888888
Text Muted:      #666666

Accent Green:    #22c55e (wins, positive, success)
Accent Red:      #ef4444 (losses, danger, errors)
Accent Yellow:   #eab308 (warnings, attention)
Accent Cyan:     #06b6d4 (info, highlights)
Accent Purple:   #a855f7 (special, jackpot glow)
```

### Typography
```
Font Family:     'JetBrains Mono', monospace
Headings:        Bold, uppercase, letter-spacing: 0.1em
Body:            Regular, 14-16px
Numbers:         Tabular figures, monospace alignment
```

### Design Principles
- **Brutalist:** Raw borders (1px solid), no rounded corners, no gradients
- **High contrast:** White on black, stark divisions
- **Glitch aesthetic:** Subtle scan lines, pixel-perfect edges
- **Terminal feel:** Monospace everywhere, command-line inspired
- **Minimal decoration:** Content over chrome

---

## Page Layout: Auction Hash Main View

### Structure (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER BAR                                                      │
│  [← Back] [AUCTION HASH] [Wallet: 0x...] [Connect]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗   │
│  ║                    JACKPOT DISPLAY                        ║   │
│  ║                                                           ║   │
│  ║              ◆ 247,832 HASH ◆                            ║   │
│  ║                 ≈ $12,450 USD                             ║   │
│  ║                                                           ║   │
│  ║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  68% to ATH              ║   │
│  ╚══════════════════════════════════════════════════════════╝   │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │    COUNTDOWN         │  │         BID PANEL                │ │
│  │                      │  │                                  │ │
│  │   REVEAL IN:         │  │  YOUR BID                        │ │
│  │   2D 14H 32M 18S     │  │  ┌────────────────────────────┐  │ │
│  │                      │  │  │ 1,500          HASH ▼     │  │ │
│  │   Sunday 20:00 UTC   │  │  └────────────────────────────┘  │ │
│  │                      │  │                                  │ │
│  │   ● AUCTION #47      │  │  SAFE ZONE: 1,200 — 1,950 HASH   │ │
│  │   ● 23 PARTICIPANTS  │  │                                  │ │
│  │                      │  │  [████████ PLACE BID ████████]   │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  LIVE BIDS                                    [Filter ▼]    ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │  #  │ BIDDER          │ AMOUNT      │ STATUS    │ TIME      ││
│  │─────┼─────────────────┼─────────────┼───────────┼───────────││
│  │  1  │ 0x7a3f...8e2d   │ 2,100 HASH  │ ⚠ DANGER  │ 2m ago    ││
│  │  2  │ 0x91bc...4f7a   │ 1,500 HASH  │ ✓ SAFE    │ 15m ago   ││
│  │  3  │ 0x45de...9c1b   │ 1,420 HASH  │ ✓ SAFE    │ 1h ago    ││
│  │  4  │ 0x2f8a...7d3e   │ 1,380 HASH  │ ✓ SAFE    │ 2h ago    ││
│  │  5  │ 0xc4e1...2a9f   │ 1,200 HASH  │ ✓ SAFE    │ 5h ago    ││
│  │  ... │ ...            │ ...         │ ...       │ ...       ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  CONSENSUS VISUALIZER                                        ││
│  │  ┌────────────────────────────────────────────────────────┐  ││
│  │  │     ·  · ·· ···████████████··· ·· ·  ·      ▲         │  ││
│  │  │  ───┴──┴─┴┴─┴┴┴┴───────────┴┴┴─┴┴─┴──┴───  2,100      │  ││
│  │  │  0                  1,500                    3,000     │  ││
│  │  │                      ▲                                 │  ││
│  │  │               CONSENSUS ZONE                           │  ││
│  │  └────────────────────────────────────────────────────────┘  ││
│  │  ◆ Cluster: 1,200-1,600 (18 bids)  ⚠ Outlier: 2,100 (1 bid) ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Jackpot Display (Hero Section)

**Purpose:** Dominant visual element showing current prize

**Specifications:**
- Full width, centered content
- Double border (══) effect using box-shadow or nested divs
- Jackpot amount: 48px font, bold, white
- USD equivalent: 18px, #888888
- Subtle purple glow animation on the amount (box-shadow pulse)
- Progress bar to All-Time-High jackpot (optional gamification)

**States:**
- Normal: White text, subtle glow
- Growing: Green flash when jackpot increases (cross-feed or new bid)
- Massive (>100k): More intense glow, particles effect

**Animation:**
```css
@keyframes jackpot-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
  50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.6); }
}
```

---

### 2. Countdown Timer

**Purpose:** Show time remaining until Sunday 20:00 UTC reveal

**Specifications:**
- Large digital clock display: `2D 14H 32M 18S`
- Each unit in separate bordered box
- Colon separators blink every second
- Below: "Sunday 20:00 UTC" in smaller text
- Auction number and participant count

**States:**
- Normal (>24h): White text
- Warning (<24h): Yellow text
- Critical (<1h): Red text, faster pulse
- Final minutes: Full red background, intense animation

**Layout:**
```
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 2D │:│14H │:│32M │:│18S │
└────┘ └────┘ └────┘ └────┘
```

---

### 3. Bid Panel

**Purpose:** Interface for placing bids

**Specifications:**
- Input field with HASH token selector
- "Safe Zone" indicator showing recommended bid range
- Large CTA button

**Input Field:**
- Border: 1px solid rgba(255,255,255,0.3)
- Focus: Border turns white
- Right side: Token dropdown (HASH, ETH, USDC)
- Placeholder: "Enter bid amount"

**Safe Zone Indicator:**
```
SAFE ZONE: 1,200 — 1,950 HASH
           ▲           ▲
      Min (not last)  Max (30% above 2nd)
```
- Green text when user's input is in safe zone
- Yellow when close to edge
- Red when outside (would be invalidated)

**CTA Button:**
- Full width
- Background: transparent
- Border: 2px solid white
- Text: "PLACE BID" uppercase
- Hover: Background white, text black (invert)
- Disabled: Border and text #666

**Validation States:**
- Empty: Button disabled
- Valid (in safe zone): Button enabled, green border hint
- Invalid (would be invalidated): Button enabled but with warning, red border
- Insufficient balance: Button disabled, error message

---

### 4. Live Bids Table

**Purpose:** Real-time leaderboard of all bids

**Specifications:**
- Sortable columns: Rank, Bidder, Amount, Status, Time
- Pagination or virtual scroll for many bids
- User's own bid highlighted with cyan background

**Columns:**
| Column | Width | Alignment | Format |
|--------|-------|-----------|--------|
| Rank | 50px | Center | #1, #2, #3... |
| Bidder | 150px | Left | 0x7a3f...8e2d (truncated) |
| Amount | 120px | Right | 1,500 HASH |
| Status | 100px | Center | ✓ SAFE / ⚠ DANGER |
| Time | 80px | Right | 2m ago |

**Status Logic:**
- `✓ SAFE` (green): This bid would win if auction ended now
- `⚠ DANGER` (yellow): Top bid but gap >30% with 2nd
- `✗ INVALID` (red): Would be invalidated in cascade
- `○ LOSING` (gray): Not in winning position

**Row States:**
- Default: Background transparent
- Hover: Background rgba(255,255,255,0.05)
- User's bid: Background rgba(6,182,212,0.1), cyan left border
- Top bid: Bold text
- Invalidated preview: Strikethrough on amount

---

### 5. Consensus Visualizer

**Purpose:** Visual representation of bid distribution

**Specifications:**
- Horizontal axis: Bid amounts (0 to max*1.2)
- Dots/bars showing bid density
- Highlight the "consensus zone" (where most bids cluster)
- Mark outliers (bids that would be invalidated)

**Visual Elements:**
- Consensus zone: Green shaded area
- Danger zone: Red shaded area (>30% from cluster)
- Individual bids: White dots, size = relative amount
- Current top bid: Pointed marker (▲)
- 30% threshold line: Dashed yellow line

**Interaction:**
- Hover on dot: Show bidder address and amount
- Click: Scroll to that bid in the table

---

## Secondary Pages

### History Page

**Purpose:** Past auction results

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  AUCTION HISTORY                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ AUCTION #46 — Jan 28, 2026                                  ││
│  │─────────────────────────────────────────────────────────────││
│  │ WINNER: 0x7a3f...8e2d                                       ││
│  │ WINNING BID: 1,847 HASH                                     ││
│  │ JACKPOT WON: 198,432 HASH ($9,920)                          ││
│  │ PARTICIPANTS: 31                                            ││
│  │ INVALIDATED: 2 bids (6.5%)                                  ││
│  │                                                             ││
│  │ [View Details ↗]                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ AUCTION #45 — Jan 21, 2026                                  ││
│  │ ...                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Auction Detail Page

**Sections:**
1. Winner announcement (large, celebratory but brutalist)
2. Full bid list with cascade visualization
3. Jackpot breakdown (sources: bids, cross-feed)
4. Timeline of bid activity

---

## Responsive Breakpoints

### Desktop (>1024px)
- Two-column layout: Countdown+Stats | Bid Panel
- Full consensus visualizer
- Table with all columns

### Tablet (768-1024px)
- Stack countdown above bid panel
- Simplified visualizer
- Table: Hide time column

### Mobile (<768px)
- Single column, everything stacked
- Countdown: Compact (2D:14H:32M)
- Table: Card view instead of table
- Visualizer: Horizontal scroll or hide

---

## Micro-interactions & Animations

### Bid Placed
1. Input field flash green
2. Button shows checkmark briefly
3. New bid slides into table from top
4. Jackpot number ticks up
5. Visualizer dot appears with pop animation

### Bid Invalidated (Preview)
1. When user types amount that would be invalidated
2. Red border pulse on input
3. Warning message slides in
4. "DANGER" status preview in table

### Countdown Critical
1. When <1 hour remaining
2. Background pulses red subtly
3. Timer digits shake slightly
4. "FINAL HOUR" banner appears

### Winner Reveal (Sunday 20:00)
1. Countdown hits 00:00:00
2. Screen flash white
3. "REVEALING..." spinner
4. Cascade animation showing invalidations
5. Winner highlight with confetti (brutalist confetti = squares)
6. Jackpot amount transfers to winner
7. "NEXT AUCTION STARTS" countdown begins

---

## Empty States

### No Bids Yet
```
┌─────────────────────────────────────┐
│                                     │
│          NO BIDS YET                │
│                                     │
│    Be the first to bid and set      │
│    the consensus price.             │
│                                     │
│    [Place First Bid]                │
│                                     │
└─────────────────────────────────────┘
```

### Wallet Not Connected
```
┌─────────────────────────────────────┐
│                                     │
│     CONNECT WALLET TO BID           │
│                                     │
│    View the auction or connect      │
│    to participate.                  │
│                                     │
│    [Connect Wallet]                 │
│                                     │
└─────────────────────────────────────┘
```

---

## Accessibility

- All interactive elements keyboard accessible
- Focus states clearly visible (white outline)
- Color not sole indicator (icons + text for status)
- Minimum contrast ratio 4.5:1
- Screen reader labels for all controls
- Reduced motion option for animations

---

## Assets Needed

1. **Icons:**
   - Bid placed checkmark
   - Warning triangle
   - Danger X
   - Trophy (winner)
   - Clock
   - Wallet
   - Arrow (back, expand)

2. **Illustrations:**
   - Empty state graphic (minimal, line art)
   - Winner celebration (brutalist confetti)

3. **Sound Effects (optional):**
   - Bid placed: Click/confirm
   - Countdown warning: Subtle beep
   - Winner reveal: Dramatic whoosh

---

## Technical Notes for Implementation

- Use CSS Grid for main layout
- Framer Motion for animations
- WebSocket for real-time bid updates
- Virtualized list for 100+ bids
- Debounce input validation (300ms)
- Optimistic UI updates on bid placement

---

*Generate high-fidelity mockups for: Main auction view (desktop), Mobile view, Winner reveal screen, History page*
