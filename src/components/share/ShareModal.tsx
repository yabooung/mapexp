'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { generateShareUrl } from '@/lib/share'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { exportData } = useMapExpStore()
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    if (isOpen) {
      const data = exportData()
      const url = generateShareUrl(data)
      setShareUrl(url)
    }
  }, [isOpen, exportData])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('공유 링크가 복사되었습니다!')
    } catch (err) {
      toast.error('링크 복사에 실패했습니다.')
      console.error(err)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="지도 공유하기"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button variant="primary" onClick={handleCopy}>
            링크 복사
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          아래 링크를 복사하여 친구들에게 내 지도를 공유해보세요!
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
          💡 공유 링크를 통해 들어오면 '보기 모드'로 열리며, '내 지도로 가져오기'를 통해 데이터를 저장할 수 있습니다.
        </div>
      </div>
    </Modal>
  )
}
