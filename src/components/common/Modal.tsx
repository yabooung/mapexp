'use client'

import React, { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * 모달 컴포넌트
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 바디 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div
      className="fixed inset-0 z-[1500] overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full ${sizeClasses[size]} transform rounded-2xl bg-card border border-line shadow-[0_1px_2px_rgba(38,35,28,0.08),0_16px_48px_rgba(38,35,28,0.22)] transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          {title && (
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h3
                id="modal-title"
                className="text-lg font-semibold text-ink"
              >
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 -m-1.5 rounded-full text-faint hover:text-ink hover:bg-paper focus:outline-none transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* 본문 */}
          <div className="px-6 py-4">{children}</div>

          {/* 푸터 */}
          {footer && (
            <div className="border-t border-line px-6 py-4">{footer}</div>
          )}
        </div>
      </div>
    </div>
  )
}
