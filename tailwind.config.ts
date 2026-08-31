import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        azure: { DEFAULT: '#1868F0', deep: '#0B47B4' },
        sky:   '#6FBFFF',
        mist:  '#D7E8FF',
        slate: '#8AA2C2',
        body:  '#4A6B93',
        paper: '#F4F8FF',
        ink:   '#0A1F3C',
        amber: { DEFAULT: '#F5A524', ink: '#B27210' },
        'owm-bg': '#eef0f4',
        'owm-border': '#e8eaef',
        'owm-text': '#1a1d2e',
        'owm-text2': '#6b728a',
        'owm-text3': '#9aa0b3',
        'owm-blue': '#4f8cff',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px' },
      backdropBlur: { glass: '20px' },
    },
  },
  plugins: [],
}
export default config
