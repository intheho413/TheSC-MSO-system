# MSO 통합 관리 시스템 — HTML 버전

## 프로젝트 개요
TheSC 화장품/의료장비 판매 관리 앱. 단일 HTML 파일(index.html) 앱.

## 기술 스택
- 순수 HTML/CSS/JS (단일 파일)
- 백엔드: Supabase (PostgreSQL) — anon key 코드에 임베드
- 라이브러리: SheetJS(xlsx-js-style), docxtemplater+PizZip, docx-preview

## 로컬 실행
```
python -m http.server 3456 --directory "C:\Users\inho4\Claude\개발\1.MSO-관리시스템"
# 브라우저: http://localhost:3456/index.html
```

## GitHub
`https://github.com/intheho413/TheSC-MSO-system` (branch: main)

## 핵심 파일
- `index.html` — 전체 앱 (단일 파일)
- `favicon.png` — 파비콘

## 주요 기능
- 글래스모피즘 UI, 다크/라이트 모드
- 화장품/의료장비 카테고리 전환
- 입고/출고/거래처/재고 관리
- 리포트 엑셀 다운로드 (SheetJS, 5개 시트)
- 계약서 발급 (docxtemplater, {{치환}} 방식)
- 설정 드로어 (앱이름·메뉴명 편집, localStorage)

## 주의사항
- 이모지 절대 사용 금지 (메뉴/버튼/제목 전부)
- 파란색 info-box div 생성 금지
- med_* 테이블(의료장비)은 Supabase에 데이터 없음 — 입력 전 "데이터 없음" 표시됨
- 삭제 구현 시 절대 num_rows="dynamic" + ID비교 방식 사용 금지

## Supabase — 삭제됨 (2026-09-05)
- **백엔드 프로젝트 wgrnqxxfzazvnbikkdgb 는 삭제되었다. 이 앱은 현재 동작하지 않는다.**
  병원 매출 지표는 S.O.S 프로젝트의 `hospital.html` 로 이관되어 그쪽에서 본다.
- 전체 백업: `_내보내기_20260905/` — 데이터 371행(json·csv·xlsx), `스키마_20260905.sql`,
  엣지 함수 2개, 계약서 서식 docx 2개, 로그인 계정 명단. 복원 절차는 `복원안내.md`.
- 다시 살리려면 새 Supabase 프로젝트(서울 리전 권장)를 만들고 위 안내를 따른 뒤,
  index.html 의 SUPABASE_URL 과 anon 키를 새 값으로 바꾼다.
- 24AI-에이전트 JENOVA 백엔드도 같은 DB 를 쓰고 있었으므로 함께 끊겼다.
- 구 TheSC-MSO Streamlit 앱은 2026-08-20 삭제됨 (코드는 GitHub claude-workspace에 보존)
