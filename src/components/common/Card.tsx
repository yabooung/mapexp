import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'sm' | 'md' | 'lg'
  onClick?: () => void
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
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }

  const hoverClass = hover ? 'hover:shadow-lg hover:scale-105 transition-all duration-200' : ''
  const cursorClass = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`bg-white rounded-lg ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClass} ${cursorClass} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}
