'use client'

import Link from 'next/link'
import { useLang, type Lang } from '@/lib/i18n'

/**
 * 개인정보처리방침 / 서비스약관 정적 문서 (회원·클라우드 동기화 도입에 따른 필수 문서).
 * UI 언어(useLang)에 맞춰 한/일/영 중 하나를 렌더한다. 이메일 등 개인 연락처는 넣지 않는다.
 */

type Section = { h: string; body: string[] }
type Doc = { title: string; updated: string; intro: string; sections: Section[]; back: string }

const UPDATED = '2026-07-22'

const PRIVACY: Record<Lang, Doc> = {
  ko: {
    title: '개인정보처리방침',
    updated: `최종 업데이트: ${UPDATED}`,
    back: '← 지도로 돌아가기',
    intro: 'MAPEXP(이하 "서비스")가 어떤 정보를 어떻게 다루는지 설명합니다. 서비스는 로그인 없이도 이용할 수 있으며, 이때 모든 기록은 이 기기의 브라우저에만 저장됩니다.',
    sections: [
      { h: '1. 수집하는 정보', body: [
        '계정 정보: 로그인 시 이메일 주소(구글 로그인 시 구글 계정 이메일). 로그인과 본인 식별 목적으로만 사용합니다.',
        '여행 기록: 방문 지역·등급·날짜·메모 등. 로그인하지 않으면 이 기기 브라우저에만 저장됩니다. 로그인하면 계정에 연결되어 클라우드(Supabase)에도 저장되어 기기 간 동기화됩니다.',
        '위치(GPS): "현재 위치 도장" 기능을 쓸 때만 기기에서 좌표를 읽어 현재 지역을 판별합니다. 좌표는 서버로 전송·저장하지 않습니다.',
        '이용 통계: 집계형 방문 통계(페이지뷰 등)를 수집합니다(Vercel). 쿠키를 사용하지 않고 개인을 식별하지 않습니다.',
      ]},
      { h: '2. 이용 목적', body: ['로그인, 기록의 클라우드 저장·기기 간 동기화, 월별 히스토리 제공을 위해 사용합니다.'] },
      { h: '3. 처리 위탁(제3자)', body: [
        'Supabase — 인증 및 데이터 저장',
        'Vercel — 호스팅 및 집계 방문 통계',
        'Google — 구글 로그인을 선택한 경우에 한함',
        '각 사업자는 자체 개인정보 정책을 따릅니다.',
      ]},
      { h: '4. 보관 및 삭제', body: [
        '계정에 저장된 데이터는 로그아웃하거나 계정을 삭제하여 제거할 수 있습니다.',
        '기기 이동용 동기화 코드는 30일 후 자동으로 만료됩니다.',
        '브라우저에 저장된 로컬 데이터는 설정의 초기화로 삭제할 수 있습니다.',
      ]},
      { h: '5. 판매·광고 없음', body: ['개인정보를 판매하지 않으며, 광고 목적의 추적을 하지 않습니다.'] },
      { h: '6. 변경', body: ['본 방침은 개정될 수 있으며, 변경 시 이 페이지에 반영합니다.'] },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    updated: `最終更新: ${UPDATED}`,
    back: '← 地図に戻る',
    intro: 'MAPEXP(以下「本サービス」)が扱う情報とその取り扱いについて説明します。本サービスはログインなしでも利用でき、その場合すべての記録はこの端末のブラウザ内にのみ保存されます。',
    sections: [
      { h: '1. 収集する情報', body: [
        'アカウント情報: ログイン時のメールアドレス(Googleログイン時はGoogleアカウントのメール)。ログインと本人識別のみに使用します。',
        '旅の記録: 訪問地域・ランク・日付・メモなど。ログインしない場合はこの端末のブラウザにのみ保存されます。ログインするとアカウントに紐づけられ、クラウド(Supabase)にも保存され端末間で同期されます。',
        '位置情報(GPS): 「現在地スタンプ」機能の利用時のみ、端末で座標を読み取り現在の地域を判定します。座標をサーバーへ送信・保存しません。',
        '利用統計: 集計的なアクセス統計(ページビュー等)を収集します(Vercel)。Cookieは使用せず、個人を識別しません。',
      ]},
      { h: '2. 利用目的', body: ['ログイン、記録のクラウド保存・端末間同期、月別履歴の提供のために利用します。'] },
      { h: '3. 委託(第三者)', body: [
        'Supabase — 認証およびデータ保存',
        'Vercel — ホスティングおよび集計アクセス統計',
        'Google — Googleログインを選択した場合のみ',
        '各事業者は各自のプライバシーポリシーに従います。',
      ]},
      { h: '4. 保存および削除', body: [
        'アカウントに保存されたデータは、ログアウトまたはアカウント削除で消去できます。',
        '端末移行用の同期コードは30日後に自動的に失効します。',
        'ブラウザ内のローカルデータは設定のリセットで削除できます。',
      ]},
      { h: '5. 販売・広告なし', body: ['個人情報を販売せず、広告目的のトラッキングも行いません。'] },
      { h: '6. 変更', body: ['本ポリシーは改定されることがあり、変更時はこのページに反映します。'] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: `Last updated: ${UPDATED}`,
    back: '← Back to the map',
    intro: 'This explains what information MAPEXP ("the Service") handles and how. The Service can be used without signing in, in which case all records are stored only in this device\'s browser.',
    sections: [
      { h: '1. Information we collect', body: [
        'Account: your email address when you sign in (your Google account email if you use Google sign-in). Used only for login and to identify you.',
        'Travel records: visited regions, grades, dates, notes. Without signing in, these stay only in this browser. When signed in, they are linked to your account and also stored in the cloud (Supabase) to sync across devices.',
        'Location (GPS): only when you use the "stamp current location" feature, coordinates are read on your device to detect your current region. Coordinates are not sent to or stored on our servers.',
        'Usage analytics: aggregate visit stats (e.g. page views) via Vercel. No cookies, no personal identification.',
      ]},
      { h: '2. How we use it', body: ['To provide login, cloud storage and cross-device sync of your records, and the monthly history feature.'] },
      { h: '3. Processors (third parties)', body: [
        'Supabase — authentication and data storage',
        'Vercel — hosting and aggregate analytics',
        'Google — only if you choose Google sign-in',
        'Each provider follows its own privacy policy.',
      ]},
      { h: '4. Retention and deletion', body: [
        'Data stored in your account can be removed by signing out or deleting your account.',
        'Device-transfer sync codes expire automatically after 30 days.',
        'Local data in your browser can be cleared via the reset option in settings.',
      ]},
      { h: '5. No selling, no ads', body: ['We do not sell personal information and do not track you for advertising.'] },
      { h: '6. Changes', body: ['This policy may be updated; changes will be reflected on this page.'] },
    ],
  },
}

const TERMS: Record<Lang, Doc> = {
  ko: {
    title: '서비스 이용약관',
    updated: `최종 업데이트: ${UPDATED}`,
    back: '← 지도로 돌아가기',
    intro: '본 약관은 MAPEXP(이하 "서비스") 이용에 적용됩니다. 서비스를 이용함으로써 본 약관에 동의하는 것으로 간주됩니다.',
    sections: [
      { h: '1. 서비스 소개', body: ['MAPEXP는 방문한 지역을 기록하고 공유하는 무료 개인 프로젝트 서비스입니다.'] },
      { h: '2. 이용', body: ['서비스를 적법하게 이용해야 하며, 서비스 방해·부정 이용·타인의 권리 침해를 해서는 안 됩니다.'] },
      { h: '3. 데이터와 백업', body: [
        '이용자가 입력한 기록은 이용자 본인의 것입니다.',
        '로컬 우선 저장 특성상, 중요한 데이터는 직접 백업(내보내기)하시길 권장합니다. 서비스는 사정에 따라 변경·중단될 수 있습니다.',
      ]},
      { h: '4. 지식재산', body: [
        '지도 데이터는 각 원출처의 라이선스를 따릅니다(하단 출처 표기 참고).',
        '"경현치(経県値)"는 uub.jp의 등록상표이며, 본 서비스는 그 개념·방식을 참고할 뿐 제휴·귀속 관계가 없습니다. 앱 코드는 MIT 라이선스로 제공됩니다.',
      ]},
      { h: '5. 책임의 한계', body: ['서비스는 "있는 그대로" 제공됩니다. 무료 서비스 특성상, 법이 허용하는 범위에서 데이터 손실·오류·중단에 대해 책임을 지지 않습니다.'] },
      { h: '6. 약관 변경', body: ['본 약관은 개정될 수 있으며, 변경 시 이 페이지에 반영합니다.'] },
    ],
  },
  ja: {
    title: '利用規約',
    updated: `最終更新: ${UPDATED}`,
    back: '← 地図に戻る',
    intro: '本規約はMAPEXP(以下「本サービス」)の利用に適用されます。本サービスを利用することで、本規約に同意したものとみなします。',
    sections: [
      { h: '1. サービスについて', body: ['MAPEXPは、訪れた地域を記録・共有する無料の個人プロジェクトです。'] },
      { h: '2. 利用', body: ['本サービスを適法に利用するものとし、サービスの妨害・不正利用・第三者の権利侵害を行ってはなりません。'] },
      { h: '3. データとバックアップ', body: [
        '利用者が入力した記録は利用者本人のものです。',
        'ローカル優先保存の性質上、重要なデータはご自身でバックアップ(エクスポート)することを推奨します。本サービスは都合により変更・停止されることがあります。',
      ]},
      { h: '4. 知的財産', body: [
        '地図データは各出典のライセンスに従います(下部の出典表記を参照)。',
        '「経県値」はuub.jpの登録商標であり、本サービスはその概念・方式を参考にするのみで、提携・帰属関係はありません。アプリのコードはMITライセンスで提供されます。',
      ]},
      { h: '5. 免責', body: ['本サービスは「現状のまま」提供されます。無料サービスの性質上、法が許す範囲で、データの損失・不具合・停止について責任を負いません。'] },
      { h: '6. 規約の変更', body: ['本規約は改定されることがあり、変更時はこのページに反映します。'] },
    ],
  },
  en: {
    title: 'Terms of Service',
    updated: `Last updated: ${UPDATED}`,
    back: '← Back to the map',
    intro: 'These terms apply to your use of MAPEXP ("the Service"). By using the Service you agree to these terms.',
    sections: [
      { h: '1. About the Service', body: ['MAPEXP is a free, personal-project service for recording and sharing the places you have visited.'] },
      { h: '2. Use', body: ['You must use the Service lawfully and must not disrupt it, abuse it, or infringe the rights of others.'] },
      { h: '3. Your data and backups', body: [
        'The records you enter are yours.',
        'Because storage is local-first, we recommend you back up (export) important data yourself. The Service may change or be discontinued.',
      ]},
      { h: '4. Intellectual property', body: [
        'Map data follows the licenses of its original sources (see the attributions in the footer).',
        '"Keikenchi (経県値)" is a registered trademark of uub.jp; this Service merely references the concept/method and is not affiliated with or endorsed by it. The app code is provided under the MIT license.',
      ]},
      { h: '5. Disclaimer', body: ['The Service is provided "as is." As a free service, to the extent permitted by law we are not liable for data loss, errors, or interruptions.'] },
      { h: '6. Changes', body: ['These terms may be updated; changes will be reflected on this page.'] },
    ],
  },
}

export default function LegalPage({ doc }: { doc: 'privacy' | 'terms' }) {
  const lang = useLang()
  const d = (doc === 'privacy' ? PRIVACY : TERMS)[lang] ?? (doc === 'privacy' ? PRIVACY.ko : TERMS.ko)

  return (
    <div className="h-full overflow-y-auto lg:h-auto lg:overflow-visible bg-paper">
      <article className="max-w-2xl mx-auto px-5 py-8 lg:py-12">
        <Link href="/" className="text-sm text-muted hover:text-ink transition-colors">
          {d.back}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink">{d.title}</h1>
        <p className="mt-1 text-xs text-faint">{d.updated}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{d.intro}</p>

        <div className="mt-6 space-y-6">
          {d.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-base font-semibold text-ink">{s.h}</h2>
              <div className="mt-2 space-y-1.5">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}
