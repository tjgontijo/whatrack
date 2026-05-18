'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LandingVariant } from './types'

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
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-zinc-200/50 border-b bg-white/80 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/80'
          : 'border-transparent border-b bg-transparent'
      }`}
    >
      <div className='mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8 lg:px-12'>
        {/* Logo */}
        <Link
          href='/'
          className='group flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80'
        >
          <Image
            src={
              scrolled
                ? '/images/logo/logo_transparent_light_horizontal.png'
                : '/images/logo/logo_transparent_dark_horizontal.png'
            }
            alt='WhaTrack'
            width={150}
            height={50}
            priority
            className='h-8 w-auto object-contain transition-all duration-300 group-hover:scale-105 sm:h-10'
          />
        </Link>

        {/* Action Buttons */}
        <div className='flex items-center gap-3'>
          <Link
            href='/sign-in'
            className={`hidden font-semibold text-sm transition-colors sm:block ${
              scrolled
                ? 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                : 'text-white/90 hover:text-white'
            }`}
          >
            Entrar
          </Link>

          <Button
            size='sm'
            className='h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 font-semibold text-white shadow-emerald-500/25 shadow-md transition-all hover:shadow-emerald-500/40 hover:shadow-lg sm:h-10 sm:px-6'
            asChild
          >
            <Link href='#planos'>Ver planos</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
