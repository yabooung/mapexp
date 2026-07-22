import { useMapExpStore } from '@/store'
import { ExperienceGrade, RegionMetadata } from '@/types'

/**
 * 다국어 사전 (한국어 / English / 日本語)
 * 값은 [ko, en, ja] 튜플. t(key)로 조회하며 {n} 등 자리표시자는 params로 치환.
 */

export type Lang = 'ko' | 'en' | 'ja'
const LANG_INDEX: Record<Lang, number> = { ko: 0, en: 1, ja: 2 }

const STRINGS = {
  // 공통 / 헤더 / 내비게이션
  // 용어는 언어별 현지화: KR=도장, JA=スタンプ, EN=stamps
  // 주의: 経県値는 uub.jp 등록상표 - 서비스명/기능명으로 쓰지 않는다 (푸터의 출처 표기만 지시적 사용으로 유지)
  // 국가 병기는 브랜딩에서 제외 (중립 유지 - 표기 순서 등 불필요한 논쟁 여지 차단)
  'app.subtitle': ['여행 도장 지도', 'Travel stamp map', '旅スタンプマップ'],
  'nav.map': ['지도', 'Map', '地図'],
  'nav.list': ['리스트', 'List', 'リスト'],
  'nav.stats': ['통계', 'Stats', '統計'],
  'common.share': ['공유', 'Share', '共有'],
  'common.settings': ['설정', 'Settings', '設定'],
  'common.close': ['닫기', 'Close', '閉じる'],
  'common.cancel': ['취소', 'Cancel', 'キャンセル'],
  'common.save': ['저장', 'Save', '保存'],
  'common.delete': ['삭제', 'Delete', '削除'],
  'common.edit': ['수정', 'Edit', '編集'],
  'common.undo': ['실행취소', 'Undo', '元に戻す'],
  // 도장 토스트의 세부 지역 진입 버튼 (짧게)
  'undo.muni': ['세부 도장', 'Go deeper', '細かく押す'],
  'common.japan': ['일본', 'Japan', '日本'],
  'common.korea': ['한국', 'Korea', '韓国'],

  // 경현치 등급 (0~5)
  'level.0': ['미답', 'Unvisited', '未踏'],
  'level.1': ['통과', 'Passed', '通過'],
  'level.2': ['접지', 'Landed', '接地'],
  'level.3': ['방문', 'Visited', '訪問'],
  'level.4': ['숙박', 'Stayed', '宿泊'],
  'level.5': ['거주', 'Lived', '居住'],
  // 각 지역 도장의 등급 (툴팁·지도 범례)
  'level.term': ['등급', 'Grade', 'ランク'],
  // 등급 한 글자 (카드 도장용)
  'level.short.0': ['미', '·', '未'],
  'level.short.1': ['통', 'P', '通'],
  'level.short.2': ['접', 'L', '接'],
  'level.short.3': ['방', 'V', '訪'],
  'level.short.4': ['숙', 'S', '泊'],
  'level.short.5': ['거', 'R', '住'],
  // 등급 한 줄 설명 (지도 툴팁 - '접지' 같은 용어를 처음 보는 사용자용)
  'level.hint.0': ['스친 적도 없다', 'Never even passed', 'かすったこともない'],
  'level.hint.1': ['지나가기만 했다', 'Just passed through', '通っただけ'],
  'level.hint.2': ['잠깐 내렸다 (환승 등)', 'Briefly set foot', '降り立った'],
  'level.hint.3': ['걸어서 돌아다녔다', 'Walked around', '歩き回った'],
  'level.hint.4': ['하룻밤 이상 묵었다', 'Stayed overnight', '泊まった'],
  'level.hint.5': ['살았다 (3개월 이상)', 'Lived there (3+ months)', '住んだ (3ヶ月以上)'],

  // 페이지 (데스크톱)
  'page.title': ['나의 여행 도장', 'My Travel Stamps', 'わたしの旅スタンプ地図'],
  'page.tagline': [
    '지나가고, 내리고, 걷고, 묵은 자리마다 도장이 쌓입니다',
    'Every pass, stop, walk, and stay leaves a stamp',
    '通って、降りて、歩いて、泊まった場所に判が積もる',
  ],
  // '관리'는 관리자 느낌이라 사용자 언어(도장 찍기)로
  'page.manageMunis': ['{term} 도장', '{term}', '{term}スタンプ'],
  'page.manageMunisLong': ['{term} 도장 찍기', 'Stamp {term}', '{term}にスタンプを押す'],
  'page.guide': [
    '지도 클릭으로 레벨 변경 (0→5→0) · 우클릭/길게 누르기로 상세 설정 · 좌하단 조준 버튼으로 GPS 추적',
    'Click map to cycle level (0→5→0) · Right-click / long-press for details · Use the locate button for GPS',
    '地図クリックでレベル変更 (0→5→0)・右クリック/長押しで詳細・左下の照準ボタンでGPS',
  ],

  // 통계
  'stats.travelerLevel': ['여행자 레벨', 'Traveler Level', '旅行者レベル'],
  'stats.exp': ['도장 {n}점', '{n} pts', 'スタンプ {n}点'],
  'stats.toNext': ['/ 다음 레벨까지 {n}점', '/ {n} pts to next level', '/ 次のレベルまで {n}点'],
  'stats.visited': ['방문 지역', 'Visited', '訪問地域'],
  'stats.completion': ['달성률', 'Completion', '達成率'],
  'stats.distribution': ['도장 분포', 'Distribution', 'スタンプ分布'],
  'stats.progress': ['진행도', 'Progress', '進行度'],
  'stats.regions': ['{a} / {b} 지역', '{a} / {b} regions', '{a} / {b} 地域'],
  'stats.points': ['{n}점', '{n}pt', '{n}点'],
  'stats.count': ['{n}', '{n}', '{n}'],

  // 도장첩 (뱃지)
  'badges.title': ['도장첩', 'Stamp Book', 'スタンプ帳'],
  'badges.viewGrid': ['도장', 'Stamps', '判'],
  'badges.viewList': ['리스트', 'List', 'リスト'],
  'badges.achieved': ['달성', 'Done', '達成'],
  'badge.first-step.name': ['첫 발자국', 'First Step', '初めの一歩'],
  'badge.first-step.desc': ['첫 지역 기록하기', 'Record your first region', '最初の地域を記録する'],
  'badge.explorer.name': ['탐험가', 'Explorer', '探検家'],
  'badge.explorer.desc': ['10개 지역 방문하기', 'Visit 10 regions', '10地域を訪問する'],
  'badge.adventurer.name': ['모험가', 'Adventurer', '冒険家'],
  'badge.adventurer.desc': ['25개 지역 방문하기', 'Visit 25 regions', '25地域を訪問する'],
  'badge.half-japan.name': ['절반 정복', 'Halfway There', '半分制覇'],
  'badge.half-japan.desc': ['달성률 50% 달성하기', 'Reach 50% completion', '達成率50%に到達する'],
  'badge.complete.name': ['전국 제패', 'Conqueror', '全国制覇'],
  'badge.complete.desc': ['모든 지역 방문하기', 'Visit every region', 'すべての地域を訪問する'],
  'badge.first-stay.name': ['첫 숙박', 'First Stay', '初宿泊'],
  'badge.first-stay.desc': ['숙박(4) 지역 만들기', 'Get a region to Stayed (4)', '宿泊(4)の地域を作る'],
  'badge.first-master.name': ['첫 마스터', 'First Master', '初マスター'],
  'badge.first-master.desc': ['거주(5) 지역 만들기', 'Get a region to Lived (5)', '居住(5)の地域を作る'],
  'badge.triple-master.name': ['트리플 마스터', 'Triple Master', 'トリプルマスター'],
  'badge.triple-master.desc': ['거주(5) 지역 3개 만들기', 'Get 3 regions to Lived (5)', '居住(5)の地域を3つ作る'],
  'badge.kansai-king.name': ['간사이 킹', 'Kansai King', '関西キング'],
  'badge.kansai-king.desc': ['간사이 6개 지역 모두 방문하기', 'Visit all 6 Kansai prefectures', '関西6府県をすべて訪問する'],
  'badge.kanto-master.name': ['간토 마스터', 'Kanto Master', '関東マスター'],
  'badge.kanto-master.desc': ['간토 7개 지역 모두 방문하기', 'Visit all 7 Kanto prefectures', '関東7都県をすべて訪問する'],
  'badge.kyushu-explorer.name': ['규슈 탐험가', 'Kyushu Explorer', '九州探検家'],
  'badge.kyushu-explorer.desc': ['규슈·오키나와 8개 지역 모두 방문하기', 'Visit all 8 Kyushu & Okinawa prefectures', '九州・沖縄8県をすべて訪問する'],
  'badge.shikoku-pilgrim.name': ['시코쿠 순례', 'Shikoku Pilgrim', '四国巡礼'],
  'badge.shikoku-pilgrim.desc': ['시코쿠 4개 지역 모두 방문하기', 'Visit all 4 Shikoku prefectures', '四国4県をすべて訪問する'],
  'badge.on-the-road.name': ['길 위에서', 'On the Road', '道の上で'],
  'badge.on-the-road.desc': ['GPS 트랙 10km 기록하기', 'Track 10km with GPS', 'GPSトラックを10km記録する'],
  'badge.capital-master.name': ['수도권 제패', 'Capital Conqueror', '首都圏制覇'],
  'badge.capital-master.desc': ['수도권 3개 지역 모두 방문하기', 'Visit all 3 capital-area regions', '首都圏3地域をすべて訪問する'],
  'badge.chungcheong-master.name': ['충청 제패', 'Chungcheong Master', '忠清マスター'],
  'badge.chungcheong-master.desc': ['충청 4개 지역 모두 방문하기', 'Visit all 4 Chungcheong regions', '忠清4地域をすべて訪問する'],
  'badge.gyeongsang-master.name': ['경상 제패', 'Gyeongsang Master', '慶尚マスター'],
  'badge.gyeongsang-master.desc': ['경상 5개 지역 모두 방문하기', 'Visit all 5 Gyeongsang regions', '慶尚5地域をすべて訪問する'],
  'badge.jeolla-master.name': ['전라 제패', 'Jeolla Master', '全羅マスター'],
  'badge.jeolla-master.desc': ['전라 2개 지역 모두 방문하기', 'Visit all Jeolla regions', '全羅地域をすべて訪問する'],
  'badge.both-countries.name': ['바다를 건너', 'Across the Sea', '海を越えて'],
  'badge.both-countries.desc': ['두 나라 모두에 도장 찍기', 'Stamp in both countries', '両国に判を押す'],
  'badge.muni-10.name': ['골목 여행자', 'Alley Traveler', '路地の旅人'],
  'badge.muni-10.desc': ['기초 지역 10곳 기록하기', 'Record 10 municipalities', '市区町村を10か所記録する'],
  'badge.muni-50.name': ['동네 수집가', 'Neighborhood Collector', '町の収集家'],
  'badge.muni-50.desc': ['기초 지역 50곳 기록하기', 'Record 50 municipalities', '市区町村を50か所記録する'],
  'badge.muni-100.name': ['방방곡곡', 'Every Corner', '津々浦々'],
  'badge.muni-100.desc': ['기초 지역 100곳 기록하기', 'Record 100 municipalities', '市区町村を100か所記録する'],
  'badge.long-road.name': ['대장정', 'The Long Road', '長い道のり'],
  'badge.long-road.desc': ['GPS 트랙 100km 기록하기', 'Track 100km with GPS', 'GPSトラックを100km記録する'],

  // GPS 컨트롤
  'gps.locating': ['내 위치를 찾는 중입니다', 'Locating you…', '現在地を取得しています'],
  'gps.trackStart': ['이동 경로 기록을 시작합니다', 'Track recording started', '移動ルートの記録を開始します'],
  'gps.trackStop': ['이동 경로 기록을 정지했습니다', 'Track recording stopped', '移動ルートの記録を停止しました'],
  'gps.trackClearConfirm': ['기록된 이동 경로를 모두 삭제하시겠습니까?', 'Delete the recorded track?', '記録した移動ルートを削除しますか？'],
  'gps.trackCleared': ['이동 경로가 삭제되었습니다', 'Track deleted', '移動ルートを削除しました'],
  'gps.quickRecord': ['접지 기록', 'Log landing', '接地を記録'],
  'gps.detail': ['상세', 'Details', '詳細'],
  'gps.quickToast': ['{label} — 접지 도장을 찍었습니다', 'Landed stamp at {label}', '{label} — 接地スタンプを押しました'],
  'gps.passToast': ['{label} — 통과 도장이 찍혔습니다', 'Passed stamp at {label}', '{label} — 通過スタンプが押されました'],
  'gps.trackAria': ['경로 기록', 'Track recording', 'ルート記録'],
  'gps.trackClear': ['경로 삭제', 'Clear track', 'ルート削除'],
  'gps.locateAria': ['내 위치', 'My location', '現在地'],
  'gps.locateStamp': ['현재 위치 도장', 'Stamp my location', '現在地にスタンプ'],
  'gps.outside': [
    '지도에 담긴 지역에 도착하면 현재 위치에 도장을 찍을 수 있어요',
    'The location stamp works when you are within a mapped region',
    '地図に含まれる地域にいるとき、現在地スタンプを押せます',
  ],
  'gps.locateError': ['현재 위치를 가져올 수 없습니다', 'Could not get your location', '現在地を取得できませんでした'],
  'gps.notSupported': ['이 브라우저는 위치 서비스를 지원하지 않습니다.', 'Geolocation is not supported in this browser.', 'このブラウザは位置情報に対応していません。'],
  'gps.denied': ['위치 권한이 거부되었습니다.', 'Location permission denied.', '位置情報の許可が拒否されました。'],

  // 설정 모달
  'settings.title': ['설정 및 데이터 관리', 'Settings & Data', '設定とデータ管理'],
  'settings.language': ['언어', 'Language', '言語'],
  'settings.gpsSection': ['GPS 위치 서비스', 'GPS Location', 'GPS位置情報'],
  'settings.autoDetect': ['자동 방문 감지', 'Auto visit detection', '自動訪問検知'],
  'settings.autoDetectDesc': [
    "새 지역에 진입하면 자동으로 '통과(1)' 기록을 남깁니다. (앱이 열려 있는 동안)",
    "Automatically logs 'Passed (1)' when you enter a new region (while the app is open).",
    '新しい地域に入ると自動で「通過(1)」を記録します。(アプリを開いている間)',
  ],
  'settings.autoDetectOn': ['자동 방문 감지가 켜졌습니다. 새 지역 진입 시 자동으로 기록됩니다.', 'Auto detection on. New regions will be logged automatically.', '自動訪問検知をオンにしました。'],
  'settings.autoDetectOff': ['자동 방문 감지가 꺼졌습니다.', 'Auto detection off.', '自動訪問検知をオフにしました。'],
  'settings.backupSection': ['데이터 백업/복원', 'Backup & Restore', 'バックアップ/復元'],
  'settings.export': ['JSON 내보내기', 'Export JSON', 'JSONエクスポート'],
  'settings.import': ['JSON 가져오기', 'Import JSON', 'JSONインポート'],
  'settings.backupDesc': ['데이터를 JSON 파일로 저장하거나 불러올 수 있습니다.', 'Save or load your data as a JSON file.', 'データをJSONファイルとして保存・読込できます。'],
  'settings.dangerSection': ['위험 구역', 'Danger Zone', '危険な操作'],
  'settings.reset': ['데이터 전체 초기화', 'Reset all data', '全データを初期化'],
  'settings.resetDesc': ['모든 지역 기록과 설정이 삭제됩니다.', 'All records and settings will be deleted.', 'すべての記録と設定が削除されます。'],
  'settings.resetConfirm': ['정말로 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', 'Delete ALL data? This cannot be undone.', '本当にすべてのデータを削除しますか？\nこの操作は元に戻せません。'],
  'settings.resetDone': ['모든 데이터가 초기화되었습니다.', 'All data has been reset.', 'すべてのデータを初期化しました。'],
  'settings.exportDone': ['데이터가 다운로드되었습니다.', 'Data downloaded.', 'データをダウンロードしました。'],
  'settings.exportFail': ['데이터 내보내기 실패', 'Export failed', 'エクスポートに失敗しました'],
  'settings.importConfirm': ['기존 데이터가 덮어씌워집니다. 계속하시겠습니까?', 'Existing data will be overwritten. Continue?', '既存のデータが上書きされます。続行しますか？'],
  'settings.importConfirmDetail': [
    '기존 기록 {a}개 지역이 파일의 {b}개 지역으로 교체됩니다.\n진행하면 현재 데이터가 자동으로 백업 다운로드됩니다. 계속하시겠습니까?',
    'Your {a} recorded regions will be replaced with {b} from the file.\nYour current data will be auto-downloaded as a backup first. Continue?',
    '既存の記録{a}地域がファイルの{b}地域に置き換わります。\n続行すると現在のデータが自動でバックアップ保存されます。よろしいですか？',
  ],
  'settings.importDone': ['데이터를 성공적으로 불러왔습니다.', 'Data imported.', 'データを読み込みました。'],
  'settings.importFail': ['잘못된 데이터 파일입니다.', 'Invalid data file.', '無効なデータファイルです。'],

  // 기기 간 동기화 (코드 방식, 계정 없음)
  'sync.section': ['기기 간 동기화', 'Sync across devices', '端末間の同期'],
  'sync.desc': [
    '코드 하나로 다른 기기(폰↔PC)에 기록을 옮깁니다. 로그인 없이 이 기기의 기록을 클라우드에 잠깐 올려두는 방식이에요.',
    'Move your records to another device (phone ↔ PC) with a single code. No login — your data is briefly uploaded to the cloud.',
    'コード1つで別の端末（スマホ↔PC）に記録を移せます。ログイン不要で、この端末の記録を一時的にクラウドへ預ける方式です。',
  ],
  'sync.create': ['동기화 코드 만들기', 'Create sync code', '同期コードを作成'],
  'sync.copy': ['복사', 'Copy', 'コピー'],
  'sync.copied': ['코드가 복사되었습니다.', 'Code copied.', 'コードをコピーしました。'],
  'sync.placeholder': ['코드 입력 (6자리)', 'Enter code (6 chars)', 'コード入力 (6桁)'],
  'sync.load': ['불러오기', 'Load', '読み込み'],
  'sync.note': [
    '다른 기기의 설정에서 이 코드를 입력하면 기록을 불러옵니다. 코드는 {days}일 후 만료돼요.',
    'Enter this code in Settings on another device to load the records. Codes expire after {days} days.',
    '別の端末の設定でこのコードを入力すると記録を読み込めます。コードは{days}日後に失効します。',
  ],
  'sync.invalidCode': ['코드는 6자리입니다.', 'Code must be 6 characters.', 'コードは6桁です。'],
  'sync.notFound': ['코드를 찾을 수 없거나 만료되었습니다.', 'Code not found or expired.', 'コードが見つからないか失効しています。'],
  'sync.notConfigured': ['동기화 서버가 아직 설정되지 않았습니다.', 'Sync server is not configured yet.', '同期サーバーが未設定です。'],
  'sync.error': ['동기화에 실패했습니다. 잠시 후 다시 시도하세요.', 'Sync failed. Please try again.', '同期に失敗しました。後でもう一度お試しください。'],

  // 회원 인증 (Supabase - 이메일 + 구글)
  'auth.title': ['로그인', 'Sign in', 'ログイン'],
  'auth.accountTitle': ['내 계정', 'My account', 'アカウント'],
  'auth.intro': [
    '로그인하면 기록이 클라우드에 자동 저장되고, 월별 히스토리를 쓸 수 있어요.',
    'Sign in to auto-save your records to the cloud and keep a monthly history.',
    'ログインすると記録がクラウドに自動保存され、月別の履歴を残せます。',
  ],
  'auth.google': ['구글로 계속하기', 'Continue with Google', 'Googleで続ける'],
  'auth.or': ['또는', 'or', 'または'],
  'auth.email': ['이메일', 'Email', 'メールアドレス'],
  'auth.password': ['비밀번호 (6자 이상)', 'Password (6+ chars)', 'パスワード (6文字以上)'],
  'auth.signIn': ['이메일로 로그인', 'Sign in with email', 'メールでログイン'],
  'auth.signUp': ['이메일로 회원가입', 'Sign up with email', 'メールで登録'],
  'auth.toSignup': ['계정이 없나요? 회원가입', "No account? Sign up", 'アカウントがない方はこちら'],
  'auth.toSignin': ['이미 계정이 있나요? 로그인', 'Already have an account? Sign in', 'すでにアカウントをお持ちの方'],
  'auth.signOut': ['로그아웃', 'Sign out', 'ログアウト'],
  'auth.member': ['회원', 'Member', '会員'],
  'auth.syncOn': ['기록이 클라우드에 자동 동기화됩니다.', 'Your records auto-sync to the cloud.', '記録はクラウドに自動同期されます。'],
  'auth.welcome': ['로그인되었습니다.', 'Signed in.', 'ログインしました。'],
  'auth.signedOut': ['로그아웃되었습니다.', 'Signed out.', 'ログアウトしました。'],
  'auth.confirmSent': ['확인 메일을 보냈어요. 메일함을 확인하세요.', 'Confirmation email sent. Check your inbox.', '確認メールを送信しました。メールをご確認ください。'],
  'auth.invalidInput': ['이메일과 6자 이상 비밀번호를 입력하세요.', 'Enter an email and a 6+ character password.', 'メールと6文字以上のパスワードを入力してください。'],
  'auth.failed': ['처리에 실패했습니다. 잠시 후 다시 시도하세요.', 'Something went wrong. Please try again.', '処理に失敗しました。後でもう一度お試しください。'],
  'auth.signinFailed': ['이메일 또는 비밀번호가 올바르지 않습니다.', 'Incorrect email or password.', 'メールまたはパスワードが正しくありません。'],
  'auth.notConfigured': ['회원 기능이 아직 설정되지 않았습니다.', 'Accounts are not configured yet.', '会員機能はまだ設定されていません。'],

  // 월별 히스토리 (회원 전용)
  'history.title': ['월별 히스토리', 'Monthly history', '月別の履歴'],
  'history.open': ['월별 히스토리 열기', 'Open monthly history', '月別履歴を開く'],
  'history.intro': [
    '방문 기록을 월별로 자동 정리했어요. 각 달에 메모를 남길 수 있습니다.',
    'Your visits, grouped by month. Add a note to any month.',
    '訪問記録を月別に自動整理しました。各月にメモを残せます。',
  ],
  'history.summary': ['{regions}곳 · {visits}회', '{regions} places · {visits} visits', '{regions}か所 · {visits}回'],
  'history.memoPlaceholder': ['이 달의 메모 (여행 소감, 계획 등)', "This month's note (thoughts, plans…)", 'この月のメモ（感想・予定など）'],
  'history.memoSaved': ['메모를 저장했습니다.', 'Note saved.', 'メモを保存しました。'],
  'history.memoFailed': ['메모 저장에 실패했습니다.', 'Failed to save note.', 'メモの保存に失敗しました。'],
  'history.empty': [
    '아직 방문 기록이 없어요. 지도에서 지역을 찍으면 월별로 정리됩니다.',
    'No visits yet. Stamp regions on the map and they’ll be organized by month.',
    'まだ訪問記録がありません。地図で地域にスタンプを押すと月別に整理されます。',
  ],
  'history.loginNeeded': ['로그인이 필요한 기능입니다.', 'Please sign in to use this.', 'ログインが必要な機能です。'],

  // 백업 알림(넛지) - 데이터는 이 브라우저에만 저장되므로 주기적으로 백업을 유도
  'backup.remindMessage': [
    '기록이 이 브라우저에만 저장돼 있어요. 캐시 삭제·기기 변경 시 사라질 수 있으니 지금 백업하세요.',
    'Your records live only in this browser. Back up now — clearing cache or switching devices will erase them.',
    '記録はこのブラウザだけに保存されています。キャッシュ削除・機種変更で消えないよう、今バックアップしましょう。',
  ],
  'backup.remindAction': ['지금 백업', 'Back up now', '今すぐバックアップ'],
  'backup.remindLater': ['나중에', 'Later', '後で'],

  // 리스트 그룹(지방/권역) 이름
  'group.hokkaido': ['홋카이도', 'Hokkaido', '北海道'],
  'group.tohoku': ['도호쿠', 'Tohoku', '東北'],
  'group.kanto': ['간토', 'Kanto', '関東'],
  'group.chubu': ['주부', 'Chubu', '中部'],
  'group.kansai': ['간사이', 'Kansai', '関西'],
  'group.chugoku': ['주고쿠', 'Chugoku', '中国'],
  'group.shikoku': ['시코쿠', 'Shikoku', '四国'],
  'group.kyushu': ['규슈·오키나와', 'Kyushu & Okinawa', '九州・沖縄'],
  'group.capital': ['수도권', 'Capital Area', '首都圏'],
  'group.gangwon': ['강원', 'Gangwon', '江原'],
  'group.chungcheong': ['충청', 'Chungcheong', '忠清'],
  'group.jeolla': ['전라', 'Jeolla', '全羅'],
  'group.gyeongsang': ['경상', 'Gyeongsang', '慶尚'],
  'group.jeju': ['제주', 'Jeju', '済州'],
  'group.hidden': ['히든', 'Hidden', '隠しエリア'],

  // 리스트
  'list.search': ['지역 검색...', 'Search regions…', '地域を検索…'],
  'list.sortGroupJp': ['지방별', 'By region', '地方別'],
  'list.sortGroupKr': ['권역별', 'By region', '圏域別'],
  'list.sortName': ['이름순', 'Name', '名前順'],
  'list.sortLevel': ['레벨순', 'Level', 'レベル順'],
  'list.hint': ['클릭: 레벨 변경 · 연필 버튼: 상세', 'Click: cycle level · Pen button: details', 'クリック: レベル変更・ペンボタン: 詳細'],
  'list.noResult': ["'{q}'에 해당하는 지역이 없습니다", "No regions match '{q}'", '「{q}」に該当する地域がありません'],

  // 지역 상세 모달
  'region.levelLabel': ['도장 등급', 'Stamp grade', 'スタンプランク'],
  // 지시적 사용: 등급 기준의 출처를 밝히는 설명문 (제품명이 아니라 uub.jp 귀속 참조)
  'region.levelNote': [
    '経県値(경현치·uub.jp)와 같은 6단계 기준입니다',
    'Same 6-level scale as 経県値 (uub.jp)',
    '経県値®（uub.jp）と同じ6段階基準です',
  ],
  'region.levelDesc.0': ['미답 (스친 적도 없다) - 0점', 'Never been (0 pt)', '未踏 (かすったこともない) - 0点'],
  'region.levelDesc.1': ['통과했다 (철도/차 통과, 배 기항. 항공기 제외) - 1점', 'Passed through by rail/car/ship (1 pt)', '通過した (鉄道・車・船。航空機は除く) - 1点'],
  'region.levelDesc.2': ['내렸다 (환승이나 휴게소 휴식 등) - 2점', 'Set foot (transfer, rest stop) (2 pt)', '降り立った (乗換や休憩など) - 2点'],
  'region.levelDesc.3': ['걸었다 (묵었던 적은 없다) - 3점', 'Walked around, never stayed (3 pt)', '歩いた (泊まったことはない) - 3点'],
  'region.levelDesc.4': ['묵었다 (야간 통과는 제외) - 4점', 'Stayed overnight (4 pt)', '泊まった (夜行通過は除く) - 4点'],
  'region.levelDesc.5': ['살았다 (3개월 정도의 장기 체류 포함) - 5점', 'Lived (incl. 3+ month stays) (5 pt)', '住んだ (3ヶ月程度の長期滞在を含む) - 5点'],
  'region.residedTitle': ['거주 (居住) — 5점 최고 등급', 'Lived — highest grade (5 pt)', '居住 — 最高ランク (5点)'],
  'region.residedDesc': ['해당 지역에서 생활한 경험이 있거나, 3개월 이상 장기 체류한 경우에 해당합니다.', 'You lived there or stayed for 3+ months.', 'その地域で生活した経験、または3ヶ月以上の長期滞在が該当します。'],
  'region.totalVisits': ['총 방문: {n}회', 'Total visits: {n}', '総訪問: {n}回'],
  'region.visitDate': ['방문일 (선택)', 'Visit date (optional)', '訪問日 (任意)'],
  'region.memo': ['메모 (선택)', 'Memo (optional)', 'メモ (任意)'],
  'region.memoPlaceholder': ['이 지역에 대한 메모를 입력하세요...', 'Notes about this region…', 'この地域についてのメモ…'],
  'region.memoLimit': ['메모는 최대 500자까지 입력 가능합니다', 'Memo is limited to 500 characters', 'メモは500文字までです'],
  'region.saved': ['지역 정보가 수정되었습니다', 'Region updated', '地域情報を更新しました'],
  'region.added': ['지역 정보가 추가되었습니다', 'Region saved', '地域情報を保存しました'],
  'region.deleteConfirm': ['이 지역의 기록을 삭제하시겠습니까?', 'Delete this region record?', 'この地域の記録を削除しますか？'],
  'region.deleted': ['지역 정보가 삭제되었습니다', 'Region deleted', '地域情報を削除しました'],
  'region.visitTip': ['방문 기록을 추가하면 방문 횟수와 숙박일이 자동 계산됩니다.', 'Add visits to auto-calculate counts and nights.', '訪問記録を追加すると回数と宿泊日数が自動計算されます。'],

  // 방문 기록
  'visits.title': ['방문 기록 ({n})', 'Visits ({n})', '訪問記録 ({n})'],
  'visits.add': ['+ 기록 추가', '+ Add visit', '+ 記録を追加'],
  'visits.start': ['시작일', 'Start', '開始日'],
  'visits.end': ['종료일', 'End', '終了日'],
  'visits.visitTitle': ['제목 (선택)', 'Title (optional)', 'タイトル (任意)'],
  'visits.titlePlaceholder': ['예: 여름 휴가, 출장', 'e.g. Summer trip', '例: 夏休み、出張'],
  'visits.durationFmt': ['({d}일간, {n}박)', '({d} days, {n} nights)', '({d}日間, {n}泊)'],
  'visits.defaultTitle': ['방문', 'Visit', '訪問'],
  'visits.gpsBadge': ['GPS 인증', 'GPS verified', 'GPS認証'],
  'visits.gpsLocked': ['GPS 인증 기록은 시간을 수정하거나 삭제할 수 없습니다', 'GPS-verified records cannot be edited or deleted', 'GPS認証記録は編集・削除できません'],
  'visits.deleteConfirm': ['이 방문 기록을 삭제하시겠습니까?', 'Delete this visit?', 'この訪問記録を削除しますか？'],
  'visits.dateRequired': ['날짜를 선택해주세요.', 'Please pick dates.', '日付を選択してください。'],
  'visits.dateOrder': ['종료일은 시작일 이후여야 합니다.', 'End date must be after start date.', '終了日は開始日以降にしてください。'],
  'visits.gpsTitle': ['GPS 인증 기록', 'GPS verified visit', 'GPS認証記録'],

  // 시·군·구 관리 모달
  // 기초 지역 용어는 UI 언어가 아니라 보고 있는 국가를 따른다 (일본=시정촌, 한국=시군구)
  'muni.count': ['{kind} {n}개', '{n} {kind}', '{kind} {n}件'],
  'muni.termJp': ['시정촌', 'municipalities', '市区町村'],
  'muni.termKr': ['시군구', 'municipalities', '市郡区'],
  'muni.search': ['{kind} 검색...', 'Search…', '{kind}を検索…'],
  'muni.cycleHint': ['클릭으로 레벨 순환 (0→5→0)', 'Click to cycle level (0→5→0)', 'クリックでレベル変更 (0→5→0)'],
  'muni.prevPref': ['이전 지역', 'Previous', '前の地域'],
  'muni.nextPref': ['다음 지역', 'Next', '次の地域'],
  'muni.progress': ['진행', 'Progress', '進行'],
  'muni.markAll': ['전체 방문 처리', 'Mark all visited', '一括訪問にする'],
  'muni.reset': ['초기화', 'Reset', 'リセット'],
  'muni.all': ['전체', 'All', 'すべて'],
  'muni.loading': ['데이터를 불러오는 중...', 'Loading…', '読み込み中…'],
  'muni.markAllConfirm': ["{name}의 기초 지역을 모두 '방문'으로 표시할까요?", "Mark all municipalities in {name} as visited?", '{name}の市区町村をすべて「訪問」にしますか？'],
  'muni.resetConfirm': ['{name}의 기초 지역 기록을 모두 초기화할까요?', 'Reset all municipality records in {name}?', '{name}の市区町村の記録をすべてリセットしますか？'],
  'muni.selectAria': ['광역 지역 선택', 'Select prefecture', '都道府県を選択'],
  'muni.locate': ['현 위치 도장 (GPS 인증)', 'Stamp my location (GPS)', '現在地に判 (GPS認証)'],
  'muni.capture': ['이 지역 이미지 저장', 'Save this region as image', 'この地域を画像で保存'],
  'muni.locateFail': ['현 위치가 지금 보고 있는 나라의 지도 밖입니다', "Your location is outside this country's map", '現在地はこの国の地図の外です'],
  'muni.viewList': ['목록', 'List', 'リスト'],
  'muni.viewMap': ['지도', 'Map', '地図'],
  'muni.mapHint': ['지도에서 지역을 눌러 레벨을 바꾸세요', 'Tap a region on the map to change its level', '地図の地域をタップしてレベルを変更'],

  // 지역별 점수
  'stats.regionScores': ['지역별 점수', 'Region scores', '地域別スコア'],
  'stats.muniTotal': ['기초 {n}점 · {m}곳', 'Municipal {n} pts · {m}', '市区町村 {n}点 · {m}件'],
  'stats.muniRow': ['기초 {n}점 · {m}곳', '+{n} pts · {m}', '+{n}点 · {m}件'],

  // 공유 카드 범위
  'share.scopeBoth': ['양국', 'Both', '両国'],
  'share.detailPref': ['광역', 'Regions', '広域'],
  'share.detailMuni': ['기초', 'Municipal', '市区町村'],
  'share.detailBoth': ['둘다', 'Both', '両方'],

  // 지도 패널
  'map.mapLang': ['지명 언어', 'Place names', '地名の言語'],
  'map.langAuto': ['자동', 'Auto', '自動'],
  'map.muniLayer': ['기초 지역', 'Municipalities', '市区町村'],
  'map.muniReadOnly': ['{term} 도장은 "{term} 도장" 메뉴에서 찍을 수 있어요', 'Stamp {term} in the "{term}" menu', '{term}の判は「{term}スタンプ」で押せます'],
  'map.label': ['라벨', 'Labels', 'ラベル'],
  'map.labelCustom': ['직접 표시', 'Custom', '独自表示'],
  'map.labelNative': ['지도 원본', 'Map default', '地図標準'],
  'map.off': ['끔', 'Off', 'オフ'],
  'map.on': ['켬', 'On', 'オン'],
  'map.tileLang': ['언어', 'Language', '言語'],
  'map.tileLocal': ['현지', 'Local', '現地'],
  'map.tileKo': ['한국어', 'Korean', '韓国語'],
  'map.tileJa': ['일본어', 'Japanese', '日本語'],
  'map.baseTiles': ['배경 지도', 'Base map', '背景地図'],
  'map.labels': ['지명', 'Labels', '地名'],
  'map.both': ['양국 지도', 'Both countries', '日韓を同時'],
  'map.settingsAria': ['지도 설정', 'Map settings', '地図設定'],
  // 이동/구경 중 실수로 지역을 탭해 등급이 바뀌는 걸 막는 잠금
  'map.editLock': ['편집 잠금', 'Lock editing', '編集ロック'],
  'map.lockedToast': ['편집 잠금 중입니다 - 지도 패널에서 해제할 수 있어요', 'Editing is locked - unlock it in the map panel', '編集ロック中です - 地図パネルで解除できます'],
  'map.loading': ['지도를 불러오는 중...', 'Loading map…', '地図を読み込み中…'],
  'map.loadFailed': ['지도 데이터를 불러오지 못했습니다', "Couldn't load map data", '地図データを読み込めませんでした'],
  'map.retry': ['다시 시도', 'Retry', '再試行'],

  // 공유
  'share.title': ['지도 공유하기', 'Share your map', '地図を共有'],
  'share.desc': ['아래 링크를 복사하여 친구들에게 내 지도를 공유해보세요!', 'Copy the link below and share your map!', '下のリンクをコピーして地図を共有しましょう！'],
  'share.copy': ['링크 복사', 'Copy link', 'リンクをコピー'],
  'share.copied': ['공유 링크가 복사되었습니다!', 'Link copied!', 'リンクをコピーしました！'],
  'share.copyFail': ['링크 복사에 실패했습니다.', 'Copy failed.', 'コピーに失敗しました。'],
  'share.native': ['공유하기', 'Share…', '共有…'],
  'share.shareText': ['내 여행 도장 지도를 확인해보세요!', 'Check out my travel stamp map!', '私の旅スタンプ地図を見てください！'],
  'share.image': ['이미지 카드 저장', 'Save image card', '画像カードを保存'],
  'share.imageDone': ['이미지 카드를 저장했습니다!', 'Image saved!', '画像を保存しました！'],
  'share.imageFail': ['이미지 생성에 실패했습니다.', 'Image generation failed.', '画像の生成に失敗しました。'],
  'share.info': [
    "공유 링크를 받은 사람은 '보기 모드'로 열리며, 마음에 들면 자기 지도 만들기를 바로 시작할 수 있습니다.",
    'Recipients open your map in view-only mode and can start their own map right away.',
    '共有リンクは閲覧モードで開き、気に入ればすぐ自分の地図を始められます。',
  ],

  // 공유 카드 티어 (달성률 구간별 칭호)
  'tier.0': ['여행 새싹', 'Sprout', '旅の芽'],
  'tier.1': ['동네 탐방가', 'Wanderer', '街歩き'],
  'tier.2': ['지도 순례자', 'Pilgrim', '地図巡礼者'],
  'tier.3': ['정복자', 'Conqueror', '征服者'],
  'tier.4': ['제패왕', 'Overlord', '制覇王'],

  // QR·파일 교환
  'share.qr': ['QR 코드', 'QR code', 'QRコード'],
  'share.qrHint': ['카메라로 찍으면 이 지도가 열립니다', 'Scan to open this map', 'カメラで読み取るとこの地図が開きます'],
  'share.fileExport': ['파일로 내보내기', 'Export file', 'ファイルに書き出し'],
  'share.fileOpen': ['받은 파일 열기', 'Open received file', '受け取ったファイルを開く'],
  'share.fileOpenHint': ['친구의 JSON 파일을 열면 내 기록은 그대로 두고 보기 모드로 열립니다', "Opens a friend's JSON in view mode — your records stay untouched", '友達のJSONを閲覧モードで開きます — 自分の記録はそのまま'],
  'share.fileInvalid': ['파일이 손상되었거나 이 앱의 파일이 아닙니다.', 'The file is damaged or not a MAPEXP file.', 'ファイルが破損しているか、このアプリのファイルではありません。'],
  'share.fileNamePrompt': ['파일에 표시할 이름 (선택 - 친구들이 구분하기 쉽게)', 'Name for the file (optional - helps friends tell files apart)', 'ファイルに入れる名前（任意 - 友達が区別しやすく）'],

  // 카드 옵션
  'share.optLabels': ['지명 표시', 'Place names', '地名を表示'],
  'share.optBadges': ['도장첩 표시', 'Badges', 'スタンプ帳を表示'],

  // 공유 뷰어
  'viewer.banner': ['공유된 지도를 보는 중 — 내 기록은 안전하게 보관돼 있어요', 'Viewing a shared map — your own records are safe', '共有地図を表示中 — 自分の記録は保管されています'],
  'viewer.compare': ['내 지도와 비교', 'Compare with mine', '自分と比較'],
  'compare.mine': ['나만', 'Only me', '自分のみ'],
  'compare.theirs': ['상대만', 'Only them', '相手のみ'],
  'compare.both': ['둘 다', 'Both', '両方'],
  'viewer.exit': ['내 지도 만들기', 'Start my map', '自分の地図へ'],
  'viewer.adopt': ['이 지도 저장', 'Save this map', 'この地図を保存'],
  'viewer.loaded': ['공유된 지도를 열었습니다 (보기 모드)', 'Shared map opened (view mode)', '共有地図を開きました (閲覧モード)'],
  'viewer.invalid': ['잘못된 공유 링크입니다.', 'Invalid share link.', '無効な共有リンクです。'],
  'viewer.adopted': ['이 지도를 내 지도로 저장했습니다', 'Saved as your map', '自分の地図として保存しました'],
  'viewer.exited': ['내 지도로 돌아왔습니다', 'Back to your map', '自分の地図に戻りました'],

  // 온보딩 (첫 방문 웰컴 모달: 언어 선택 + 간단 매뉴얼)
  'onboard.title': ['여행 도장 지도에 오신 것을 환영합니다', 'Welcome to your travel stamp map', '旅スタンプマップへようこそ'],
  'onboard.tap': [
    '지역을 탭하면 도장이 찍히고, 탭할 때마다 등급이 올라갑니다',
    'Tap a region to stamp it — each tap raises the grade',
    '地域をタップすると判が押せて、タップごとにランクが上がります',
  ],
  'onboard.detail': [
    '길게 누르면 메모·방문 기록 같은 상세를 열 수 있습니다',
    'Long-press a region for details — memos and visit logs',
    '長押しでメモ・訪問記録などの詳細を開けます',
  ],
  'onboard.muni': [
    '더 촘촘하게 — {term} 단위 도장은 "{term} 도장" 메뉴에서 찍습니다',
    'Go deeper — stamp individual {term} from the "{term}" menu',
    'もっと細かく — {term}単位の判は「{term}スタンプ」から押せます',
  ],
  'onboard.gps': [
    '좌하단 조준 버튼을 켜면 지금 있는 지역을 GPS로 자동 감지합니다',
    'Turn on the locate button to auto-detect where you are with GPS',
    '左下の照準ボタンでGPSが現在の地域を自動検知します',
  ],
  'onboard.privacy': [
    '기록은 내 기기에만 저장되고, 공유 버튼으로 내 지도를 자랑할 수 있습니다',
    'Everything stays on your device — share your map with the share button',
    '記録は端末にのみ保存され、共有ボタンで自分の地図を自慢できます',
  ],
  'onboard.start': ['시작하기', 'Get started', 'はじめる'],

  // 푸터
  'footer.privacy': [
    '기록과 위치 정보는 내 기기(브라우저)에만 저장됩니다',
    'Your records and location never leave your device',
    '記録と位置情報は端末内にのみ保存されます',
  ],
  'footer.sources': ['지도 데이터 출처:', 'Map data:', '地図データ出典:'],
  'footer.concept': [
    "'경현치(経県値)' 개념 원조",
    'Based on the 経県値 concept by',
    '「経県値Ⓡ」の概念元',
  ],

  // 레벨업
  'levelup.title': ['Level Up', 'Level Up', 'Level Up'],
  'levelup.sub': ['여행자 레벨', 'Traveler Level', '旅行者レベル'],
  'levelup.badgeToast': ['도장 획득 — {name}', 'Stamp earned — {name}', 'スタンプ獲得 — {name}'],
} as const

export type I18nKey = keyof typeof STRINGS

export function translate(key: I18nKey, lang: Lang, params?: Record<string, string | number>): string {
  const entry = STRINGS[key]
  let text: string = entry ? entry[LANG_INDEX[lang]] : key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}

/** 현재 언어 (스토어 설정) */
export function useLang(): Lang {
  return useMapExpStore((s) => s.settings.language ?? 'ko') as Lang
}

/** 컴포넌트용 번역 훅 */
export function useT() {
  const lang = useLang()
  return (key: I18nKey, params?: Record<string, string | number>) => translate(key, lang, params)
}

/** 비컴포넌트 컨텍스트용 (토스트 등) */
export function tNow(key: I18nKey, params?: Record<string, string | number>): string {
  const lang = (useMapExpStore.getState().settings.language ?? 'ko') as Lang
  return translate(key, lang, params)
}

/** 등급 라벨 */
export function levelLabel(level: ExperienceGrade, lang: Lang): string {
  return translate(`level.${level}` as I18nKey, lang)
}

/** 기초 지역 용어 - UI 언어가 아니라 국가 기준 (일본=시정촌, 한국=시군구) */
export function muniTerm(country: 'japan' | 'korea', lang: Lang): string {
  return translate(country === 'japan' ? 'muni.termJp' : 'muni.termKr', lang)
}

/** 지역 표시 이름 (언어별) */
export function regionDisplayName(meta: RegionMetadata, lang: Lang): string {
  if (lang === 'ko') return meta.name
  if (lang === 'en') return meta.nameEn
  // ja: 일본 지역은 현지어(일본어), 한국 지역은 한자 표기+가나 (없으면 로마자 폴백)
  return meta.country === 'japan' ? meta.nameLocal : (meta.nameJa ?? meta.nameEn)
}

/** 지도 지명 표시 언어 (auto = UI 언어 따름). 지도 위 지명(툴팁/라벨) 전용 */
export function mapLangNow(): Lang {
  const s = useMapExpStore.getState().settings
  const ml = s.mapLanguage ?? 'auto'
  return (ml === 'auto' ? (s.language ?? 'ko') : ml) as Lang
}

/** 컴포넌트용 지도 지명 언어 훅 (설정 변경 시 리렌더) */
export function useMapLang(): Lang {
  return useMapExpStore((s) => {
    const ml = s.settings.mapLanguage ?? 'auto'
    return (ml === 'auto' ? (s.settings.language ?? 'ko') : ml) as Lang
  })
}
