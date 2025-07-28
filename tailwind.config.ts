import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
			primary: {
				DEFAULT: 'hsl(var(--primary))',
				foreground: 'hsl(var(--primary-foreground))',
				glow: 'hsl(var(--primary-glow))',
				deep: 'hsl(var(--primary-deep))'
			},
			secondary: {
				DEFAULT: 'hsl(var(--secondary))',
				foreground: 'hsl(var(--secondary-foreground))'
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
			muted: {
				DEFAULT: 'hsl(var(--muted))',
				foreground: 'hsl(var(--muted-foreground))'
			},
			accent: {
				DEFAULT: 'hsl(var(--accent))',
				foreground: 'hsl(var(--accent-foreground))',
				secondary: 'hsl(var(--accent-secondary))'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))'
			},
			sidebar: {
				DEFAULT: 'hsl(var(--sidebar-background))',
				foreground: 'hsl(var(--sidebar-foreground))',
				primary: 'hsl(var(--sidebar-primary))',
				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
				accent: 'hsl(var(--sidebar-accent))',
				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
				border: 'hsl(var(--sidebar-border))',
				ring: 'hsl(var(--sidebar-ring))'
			},
			// Enhanced music-specific colors
			beat: {
				card: 'hsl(var(--beat-card))',
				hover: 'hsl(var(--beat-hover))'
			},
			ai: 'hsl(var(--ai-highlight))',
			success: 'hsl(var(--success))',
			warning: 'hsl(var(--warning))'
			},
		backgroundImage: {
			'gradient-primary': 'var(--gradient-primary)',
			'gradient-secondary': 'var(--gradient-secondary)',
			'gradient-accent': 'var(--gradient-accent)',
			'gradient-card': 'var(--gradient-card)',
			'gradient-ai': 'var(--gradient-ai)',
			'gradient-hero': 'var(--gradient-hero)',
			'gradient-subtle': 'var(--gradient-subtle)'
		},
		boxShadow: {
			'glow': 'var(--shadow-glow)',
			'beat': 'var(--shadow-beat)',
			'ai': 'var(--shadow-ai)',
			'card': 'var(--shadow-card)',
			'intense': 'var(--shadow-intense)'
		},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			'fade-in': {
				'0%': {
					opacity: '0',
					transform: 'translateY(20px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'fade-out': {
				'0%': {
					opacity: '1',
					transform: 'translateY(0)'
				},
				'100%': {
					opacity: '0',
					transform: 'translateY(20px)'
				}
			},
			'scale-in': {
				'0%': {
					transform: 'scale(0.95)',
					opacity: '0'
				},
				'100%': {
					transform: 'scale(1)',
					opacity: '1'
				}
			},
			'waveform': {
				'0%, 100%': { height: '4px' },
				'50%': { height: '24px' }
			},
			'float': {
				'0%, 100%': { transform: 'translateY(0px)' },
				'50%': { transform: 'translateY(-10px)' }
			},
			'glow-pulse': {
				'0%, 100%': { 
					boxShadow: 'var(--shadow-card)'
				},
				'50%': { 
					boxShadow: 'var(--shadow-glow)'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'fade-in': 'fade-in 0.6s ease-out',
			'fade-out': 'fade-out 0.4s ease-out',
			'scale-in': 'scale-in 0.3s ease-out',
			'waveform': 'waveform 1.5s ease-in-out infinite',
			'float': 'float 3s ease-in-out infinite',
			'glow-pulse': 'glow-pulse 2s ease-in-out infinite'
		}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
