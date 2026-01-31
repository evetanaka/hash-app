import { GameMode } from '../types'

interface DigitPickerProps {
  mode: GameMode
  value: number | null
  onChange: (value: number) => void
}

const HEX_CHARS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

export function DigitPicker({ mode, value, onChange }: DigitPickerProps) {
  if (mode === GameMode.ONE_DIGIT) {
    return (
      <div className="digit-grid">
        {HEX_CHARS.map((char, index) => (
          <button
            key={char}
            className={`digit-btn ${value === index ? 'selected' : ''}`}
            onClick={() => onChange(index)}
          >
            {char}
          </button>
        ))}
      </div>
    )
  }

  // For 2-3 digits, use text input
  return (
    <div className="digit-input">
      <input
        type="text"
        placeholder={mode === GameMode.TWO_DIGIT ? '00-ff' : '000-fff'}
        maxLength={mode === GameMode.TWO_DIGIT ? 2 : 3}
        value={value !== null ? value.toString(16).padStart(mode === GameMode.TWO_DIGIT ? 2 : 3, '0') : ''}
        onChange={(e) => {
          const val = e.target.value.toLowerCase()
          if (/^[0-9a-f]*$/.test(val)) {
            const num = parseInt(val || '0', 16)
            const max = mode === GameMode.TWO_DIGIT ? 255 : 4095
            if (num <= max) {
              onChange(num)
            }
          }
        }}
      />
      <button
        className="random-btn"
        onClick={() => {
          const max = mode === GameMode.TWO_DIGIT ? 256 : 4096
          onChange(Math.floor(Math.random() * max))
        }}
      >
        🎲 Random
      </button>
    </div>
  )
}
