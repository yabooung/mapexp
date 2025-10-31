import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        exp: {
          unvisited: '#E5E5E5',
          passed: '#FEF3C7',
          stopped: '#FCD34D',
          visited: '#F59E0B',
          resided: '#DC2626',
          master: '#FFD700',
        },
      },
    },
  },
  plugins: [],
}
export default config


