import type { Metadata } from 'next'
import { Newsreader, Space_Grotesk } from 'next/font/google'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'lumi.',
  description: 'Your AI wellness and focus companion.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${newsreader.variable} ${spaceGrotesk.variable}`} style={{ fontFamily: "var(--font-sans), 'Space Grotesk', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
