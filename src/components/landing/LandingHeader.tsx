'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { LandingVariant } from './types'
import { motion } from 'motion/react'
import { useState, useEffect } from 'react'

interface LandingHeaderProps {
  variant?: LandingVariant
}

export function LandingHeader({ variant: _variant = 'generic' }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-zinc-200/50 bg-white/80 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/80'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="group flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Image
            src="/images/logo_transparent.png"
            alt="WhaTrack"
            width={120}
            height={40}
            priority
            className={`h-8 w-auto object-contain transition-all duration-300 group-hover:scale-105 ${
              scrolled ? 'brightness-0 dark:brightness-100' : 'brightness-100'
            }`}
          />
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className={`hidden text-sm font-semibold transition-colors sm:block ${
              scrolled
                ? 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                : 'text-white/90 hover:text-white'
            }`}
          >
            Entrar
          </Link>

          <Button
            className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/40"
            asChild
          >
            <Link href="/sign-up">Testar Grátis</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
