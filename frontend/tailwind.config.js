export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66'
        },
        accent: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
        'soft-lg': '0 20px 50px rgba(15, 23, 42, 0.12)',
        'glow': '0 0 30px rgba(14, 165, 233, 0.15)'
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        'gradient-accent': 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
        'gradient-soft': 'linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)'
      }
    }
  },
  plugins: []
};
