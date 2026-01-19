'use client'

import { useRef } from 'react'
import { useMapExpStore } from '@/store'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { exportData, importData, clearAllRegions } = useMapExpStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 데이터 내보내기 (JSON 다운로드)
  const handleExport = () => {
    try {
      const data = exportData()
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `mapexp-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('데이터가 다운로드되었습니다.')
    } catch (err) {
      console.error(err)
      toast.error('데이터 내보내기 실패')
    }
  }

  // 데이터 가져오기 (JSON 업로드)
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const data = JSON.parse(json)
        
        if (confirm('기존 데이터가 덮어씌워집니다. 계속하시겠습니까?')) {
          importData(data)
          toast.success('데이터를 성공적으로 불러왔습니다.')
          onClose()
        }
      } catch (err) {
        console.error(err)
        toast.error('잘못된 데이터 파일입니다.')
      }
    }
    reader.readAsText(file)
    // 입력 초기화
    e.target.value = ''
  }

  // 데이터 초기화
  const handleReset = () => {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      clearAllRegions()
      toast.success('모든 데이터가 초기화되었습니다.')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="설정 및 데이터 관리"
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 데이터 백업/복원 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            데이터 백업/복원
          </h3>
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleExport} className="flex-1">
              📥 JSON 내보내기
            </Button>
            <Button variant="secondary" onClick={handleImportClick} className="flex-1">
              📤 JSON 가져오기
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            데이터를 JSON 파일로 저장하거나 불러올 수 있습니다.
          </p>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* 위험 구역 */}
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-3">
            위험 구역
          </h3>
          <Button variant="danger" onClick={handleReset} className="w-full">
            🗑️ 데이터 전체 초기화
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            모든 지역 기록과 설정이 삭제됩니다.
          </p>
        </div>
      </div>
    </Modal>
  )
}
