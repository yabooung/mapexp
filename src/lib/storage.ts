import { MapExpData } from '@/types'
import { STORAGE_KEYS, DATA_VERSION } from '@/constants'

/**
 * LocalStorage에 데이터 저장
 */
export const saveToLocalStorage = (key: string, data: unknown): boolean => {
  if (typeof window === 'undefined') return false

  try {
    const jsonString = JSON.stringify(data)
    localStorage.setItem(key, jsonString)
    return true
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
    return false
  }
}

/**
 * LocalStorage에서 데이터 불러오기
 */
export const loadFromLocalStorage = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null

  try {
    const jsonString = localStorage.getItem(key)
    if (!jsonString) return null

    return JSON.parse(jsonString) as T
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * LocalStorage에서 데이터 삭제
 */
export const removeFromLocalStorage = (key: string): boolean => {
  if (typeof window === 'undefined') return false

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('Failed to remove from localStorage:', error)
    return false
  }
}

/**
 * LocalStorage 전체 삭제
 */
export const clearLocalStorage = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    localStorage.clear()
    return true
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
    return false
  }
}

/**
 * JSON 파일로 데이터 다운로드
 */
export const exportToJson = (data: MapExpData, filename?: string): void => {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `mapexp_${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * JSON 파일에서 데이터 가져오기
 */
export const importFromJson = (file: File): Promise<MapExpData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string
        const data = JSON.parse(jsonString) as MapExpData

        // 데이터 유효성 검사
        if (!data.version || !data.country || !Array.isArray(data.regions)) {
          throw new Error('Invalid data format')
        }

        resolve(data)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * 데이터 유효성 검사
 */
export const validateMapExpData = (data: unknown): data is MapExpData => {
  if (!data || typeof data !== 'object') return false

  const mapData = data as Partial<MapExpData>

  return !!(
    mapData.version &&
    typeof mapData.version === 'string' &&
    mapData.country &&
    (mapData.country === 'japan' || mapData.country === 'korea') &&
    Array.isArray(mapData.regions) &&
    mapData.createdAt &&
    mapData.updatedAt
  )
}

/**
 * 스토리지 용량 확인 (MB)
 */
export const getStorageSize = (): number => {
  if (typeof window === 'undefined') return 0

  let total = 0
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      const value = localStorage[key]
      total += key.length + value.length
    }
  }

  // 바이트를 MB로 변환
  return total / (1024 * 1024)
}

/**
 * 백업 생성
 */
export const createBackup = (data: MapExpData): void => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `mapexp_backup_${timestamp}.json`
  exportToJson(data, filename)
}



