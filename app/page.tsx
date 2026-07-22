import AppRoot from '@/components/AppRoot'

// 루트(/): 브라우저 언어 자동 판정. 메타데이터/ hreflang은 layout.tsx가 x-default로 제공.
export default function Page() {
  return <AppRoot />
}
