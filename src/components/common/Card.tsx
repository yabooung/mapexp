import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'sm' | 'md' | 'lg'
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  hover?: boolean
  style?: React.CSSProperties
}

/**
 * 카드 레이아웃 컴포넌트
 */
export default function Card({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  onClick,
  hover = false,
  style,
}: CardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  const shadowClasses = {
    sm: '',
    md: '',
    lg: 'shadow-[0_4px_16px_rgba(38,35,28,0.08)]',
  }

  const hoverClass = hover ? 'hover:border-faint transition-colors duration-150' : ''
  const cursorClass = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`bg-card border border-line rounded-[10px] ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClass} ${cursorClass} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}
