/**
 * TheSC MSO — Google Sheets Bridge (Apps Script Web App)
 *
 * 목적: MSO 관리 시스템(index.html)에서 Google Sheets 데이터를
 *      JSON으로 불러올 수 있게 하는 간이 API.
 *
 * ─── 배포 절차 ─────────────────────────────────────────
 *  1. 시트 열기 → 상단 확장 프로그램 → Apps Script
 *  2. 기본 코드 지우고 이 파일 전체 붙여넣기
 *  3. 상수 `SECRET_TOKEN` 값을 임의의 랜덤 문자열로 변경
 *     (예: crypto.randomUUID() 결과나 openssl rand -hex 24)
 *  4. 저장 (Ctrl+S) → 프로젝트 이름 지정
 *  5. 우측 상단 "배포" → "새 배포"
 *  6. 톱니바퀴 → "웹 앱" 선택
 *  7. 설정:
 *     - 설명: "MSO Sheets Bridge v1"
 *     - 다음 사용자 인증 정보로 실행: 나
 *     - 액세스 권한이 있는 사용자: 모든 사용자
 *  8. 배포 → 권한 요청 승인 → URL 복사
 *  9. 복사한 URL을 앱에 등록 (예:
 *     https://script.google.com/macros/s/AKfyc.../exec)
 *
 * ─── 사용 예시 ─────────────────────────────────────────
 *  단일 시트 (헤더=1행):
 *    <URL>?token=<TOKEN>&sheet=운영지표
 *  헤더가 다른 행에 있는 시트 (예: 13행):
 *    <URL>?token=<TOKEN>&sheet=간호 재고관리 (26년 8월)&headerRow=13
 *  원시 2D 배열 (헤더 파싱 없이):
 *    <URL>?token=<TOKEN>&sheet=간호 재고관리 (26년 8월)&raw=1
 *  여러 시트 한 번에:
 *    <URL>?token=<TOKEN>&sheets=운영지표,재고소모품,일매출
 *  시트 목록만:
 *    <URL>?token=<TOKEN>&list=1
 *
 * ─── 응답 형태 ─────────────────────────────────────────
 *  { "ok": true,
 *    "updated": "2026-08-30T02:00:00.000Z",
 *    "sheets": {
 *      "운영지표": { "count": 12, "rows": [ { "병원명": "...", ... }, ... ] }
 *    }
 *  }
 *
 *  오류: { "ok": false, "error": "메시지" }
 *
 * ─── 주의 ─────────────────────────────────────────────
 *  - 코드 수정 후에는 "새 배포" 아니면 "기존 배포 관리 → 편집(연필) → 새 버전"
 *    으로 재배포해야 반영됨. 단순 저장만으로는 배포된 URL 응답이 바뀌지 않음.
 *  - TOKEN은 URL에 노출되므로 서비스급 비밀 정보는 절대 시트에 넣지 말 것.
 *  - Apps Script 웹앱 무료 한도: 하루 20,000회 실행 (개인 계정 기준).
 */

const SECRET_TOKEN = 'CHANGE_ME_TO_RANDOM_STRING';

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};

    // 1) 토큰 검증
    if (!p.token || p.token !== SECRET_TOKEN) {
      return _json({ ok: false, error: 'Unauthorized' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 2) 시트 목록만 요청 (앱에서 어떤 시트가 있는지 확인용)
    if (p.list === '1' || p.list === 'true') {
      const names = ss.getSheets().map(function (s) { return s.getName(); });
      return _json({ ok: true, updated: new Date().toISOString(), sheetNames: names });
    }

    // 3) 시트 이름 파싱 — sheet 단일 또는 sheets 콤마 구분
    var names = [];
    if (p.sheets) {
      names = String(p.sheets).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    } else if (p.sheet) {
      names = [String(p.sheet).trim()];
    } else {
      return _json({ ok: false, error: 'Missing sheet or sheets param' });
    }

    // 4) 각 시트 데이터 → JSON
    var headerRow = p.headerRow ? Math.max(1, parseInt(p.headerRow, 10)) : 1;
    var rawMode = (p.raw === '1' || p.raw === 'true');
    var result = {};
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        result[name] = { error: 'Sheet not found' };
        continue;
      }
      if (rawMode) {
        var vals = sheet.getDataRange().getValues();
        var isoVals = vals.map(function(row){ return row.map(function(c){ return (c instanceof Date) ? c.toISOString() : c; }); });
        result[name] = { rowCount: isoVals.length, colCount: isoVals[0] ? isoVals[0].length : 0, values: isoVals };
      } else {
        result[name] = _sheetToJson(sheet, headerRow);
      }
    }

    return _json({ ok: true, updated: new Date().toISOString(), sheets: result });
  } catch (err) {
    return _json({ ok: false, error: String(err && err.message || err) });
  }
}

// 헤더 행(기본 1) = 키, 나머지 행 = 객체 배열
function _sheetToJson(sheet, headerRow) {
  headerRow = headerRow || 1;
  var values = sheet.getDataRange().getValues();
  if (values.length < headerRow + 1) {
    return { count: 0, rows: [] };
  }
  var headers = values[headerRow - 1].map(function (h) { return String(h == null ? '' : h).trim(); });
  var rows = [];
  for (var r = headerRow; r < values.length; r++) {
    var row = values[r];
    // 완전히 비어있는 행 제외
    var isEmpty = true;
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] !== null && row[c] !== undefined) { isEmpty = false; break; }
    }
    if (isEmpty) continue;

    var obj = {};
    for (var c2 = 0; c2 < headers.length; c2++) {
      var key = headers[c2];
      if (!key) continue;                    // 빈 헤더는 스킵
      var val = row[c2];
      // Date → ISO 문자열로 변환 (JSON 표준)
      if (val instanceof Date) val = val.toISOString();
      obj[key] = val;
    }
    rows.push(obj);
  }
  return { count: rows.length, rows: rows };
}

function _json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
