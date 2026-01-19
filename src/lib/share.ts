import LZString from 'lz-string'
import { MapExpData } from '@/types'

/**
 * 공유 데이터 타입 (최소화)
 * URL 길이를 줄이기 위해 필요한 데이터만 포함
 */
export interface ShareData {
  c: 'j' | 'k'  // country (j: japan, k: korea)
  r: string[]   // regions: "id:level" 형태의 문자열 배열
}

/**
 * 공유 URL 생성
 */
export const generateShareUrl = (data: MapExpData): string => {
  // 데이터 축소
  const shareData: ShareData = {
    c: data.country === 'japan' ? 'j' : 'k',
    r: data.regions.map(r => `${r.regionId}:${r.level}`)
  }

  // JSON -> 문자열 -> 압축
  const jsonString = JSON.stringify(shareData)
  const compressed = LZString.compressToEncodedURIComponent(jsonString)

  // 현재 URL 기반으로 공유 URL 생성
  const baseUrl = window.location.origin
  return `${baseUrl}?share=${compressed}`
}

/**
 * 공유 URL 파싱
 */
export const parseShareUrl = (compressed: string): Partial<MapExpData> | null => {
  try {
    // 압축 해제 -> 문자열 -> JSON
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed)
    
    if (!decompressed) return null
    
    const shareData = JSON.parse(decompressed) as ShareData
    
    // 데이터 복원
    return {
      country: shareData.c === 'j' ? 'japan' : 'korea',
      regions: shareData.r.map(str => {
        const [regionId, levelStr] = str.split(':')
        const level = parseInt(levelStr)
        
        return {
          regionId,
          level: isNaN(level) ? 0 : level,
          updatedAt: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    console.error('Failed to parse share URL:', error)
    return null
  }
}
