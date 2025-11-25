# Mermaid Diagram Editor - 전체 프로젝트 문서

이 문서는 프로젝트의 모든 파일과 코드를 line by line으로 설명합니다.

## 📁 프로젝트 구조

```
diagram/
├── manifest.json                 # Chrome Extension 설정 파일
├── src/
│   ├── editor/                   # 메인 에디터
│   │   ├── editor.html          # 에디터 UI
│   │   ├── editor.css           # 에디터 스타일
│   │   ├── editor.js            # 에디터 로직 (가장 중요!)
│   │   └── mermaid-init.js      # Mermaid 라이브러리 초기화
│   ├── popup/                    # Extension 팝업
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── settings/                 # 설정 페이지
│   │   ├── settings.html
│   │   ├── settings.css
│   │   └── settings.js
│   ├── library/                  # 다이어그램 라이브러리
│   │   ├── library.html
│   │   ├── library.css
│   │   └── library.js
│   ├── content/                  # Content Script (웹 페이지 주입)
│   │   ├── content.js
│   │   └── viewer.css
│   ├── background/               # Background Service Worker
│   │   └── service-worker.js
│   └── libs/                     # 로컬 라이브러리 (CDN 대신)
│       ├── mermaid.min.js       # Mermaid 다이어그램 라이브러리
│       └── jspdf.umd.min.js     # PDF 내보내기 라이브러리
└── assets/                       # 아이콘 등
    └── icons/
```

---

## 🎯 주요 파일 상세 설명

### 1. `manifest.json` - Extension 설정

Chrome Extension의 설정 파일입니다.

```json
{
  "manifest_version": 3,          // Manifest V3 사용 (최신 버전)
  "name": "...",                  // Extension 이름
  "version": "1.2.0",            // 버전
  "permissions": [                // 필요한 권한
    "storage",                    // - chrome.storage API (설정 저장)
    "activeTab",                  // - 현재 탭 접근
    "contextMenus"                // - 우클릭 메뉴
  ],
  "web_accessible_resources": [   // 웹에서 접근 가능한 리소스
    {
      "resources": [
        "src/libs/*",             // Mermaid, jsPDF 라이브러리
        "src/editor/editor.html"   // 에디터 페이지
      ]
    }
  ]
}
```

---

### 2. `src/editor/editor.js` - 핵심 로직 (2000+ 줄)

**이 파일이 가장 중요합니다!** 모든 드래그, 편집, 저장 기능이 여기에 있습니다.

#### 📌 **전역 변수 섹션 (1-60줄)**

```javascript
// 현재 편집 중인 다이어그램 객체
let currentDiagram = null;
// { id, title, code, type, createdAt, updatedAt }

// 미리보기 업데이트 디바운스 타이머
let debounceTimer = null;
// 500ms 대기 후 미리보기 갱신

// 줌 레벨 (100 = 기본 크기)
let zoomLevel = 100;

// 드래그 앤 드롭 상태
let dragState = {
  enabled: false,           // Drag Mode가 활성화되었는지
  dragging: false,          // 현재 드래그 중인지
  currentElement: null,     // 드래그 중인 SVG 요소 (노드, edge 등)
  offset: { x: 0, y: 0 },   // 마우스 클릭 위치와 요소의 오프셋
  diagramHash: null,        // 다이어그램 식별용 SHA-256 해시
  gridSnap: false,          // Grid Snap 활성화 여부
  gridSize: 10,             // Grid 크기 (px)
  selectedNodes: []         // 선택된 노드들 (향후 다중 선택 지원용)
};
```

#### 📌 **DOM 요소 참조 (61-70줄)**

```javascript
// HTML 요소들을 JavaScript 변수로 참조
const codeEditor = document.getElementById('codeEditor');      // Mermaid 코드 입력창
const preview = document.getElementById('preview');            // 미리보기 영역
const errorMessage = document.getElementById('errorMessage'); // 에러 메시지
const diagramTitle = document.getElementById('diagramTitle'); // 다이어그램 제목
const status = document.getElementById('status');             // 상태 표시 (Ready, Rendering...)
```

#### 📌 **초기화 함수 (71-150줄)**

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Mermaid 라이브러리 로딩 대기
  await window.mermaidReady;  // mermaid-init.js에서 생성한 Promise

  // 2. URL에서 코드 로드 (외부 링크로 열기 지원)
  loadFromURL();

  // 3. 이벤트 리스너 설정
  setupEventListeners();

  // 4. 첫 미리보기 렌더링
  updatePreview();
});
```

#### 📌 **미리보기 렌더링 (200-280줄)**

```javascript
async function updatePreview() {
  const code = codeEditor.value.trim();

  // 1. Mermaid 라이브러리 확인
  if (!window.mermaid) {
    await window.mermaidReady;
  }

  // 2. 다이어그램 해시 생성 (레이아웃 저장용)
  dragState.diagramHash = await generateHash(code);

  // 3. Mermaid로 SVG 생성
  const { svg } = await window.mermaid.render('preview-diagram', code);
  preview.innerHTML = svg;

  // 4. Drag Mode가 활성화되어 있으면 드래그 가능하게 만들기
  if (dragState.enabled) {
    enableNodeDragging();
  }

  // 5. 저장된 레이아웃 복원
  await restoreLayout(dragState.diagramHash);
}
```

#### 📌 **Drag Mode 핵심 (900-1200줄)**

**이 부분이 드래그 기능의 핵심입니다!**

```javascript
function makeNodesDraggable(svg) {
  // === 1. 무한 확장 방지 ===
  const MAX_WIDTH = 3840;   // 최대 너비 (4K)
  const MAX_HEIGHT = 2160;  // 최대 높이 (4K)

  const currentWidth = parseFloat(svg.getAttribute('width'));
  const currentHeight = parseFloat(svg.getAttribute('height'));

  // 크기 제한 초과 시 스케일 다운
  if (currentWidth > MAX_WIDTH || currentHeight > MAX_HEIGHT) {
    const scale = Math.min(MAX_WIDTH / currentWidth, MAX_HEIGHT / currentHeight);
    svg.setAttribute('width', currentWidth * scale);
    svg.setAttribute('height', currentHeight * scale);
  }

  // === 2. 드래그 가능한 요소 찾기 ===
  const draggableElements = svg.querySelectorAll(
    'g.node, ' +          // 노드 (박스, 원 등)
    'path, ' +            // Edge (화살표)
    'text, ' +            // 텍스트 라벨
    'foreignObject'       // HTML 라벨
  );

  // === 3. 각 요소에 드래그 핸들러 추가 ===
  draggableElements.forEach(element => {
    element.style.cursor = 'grab';  // 커서 모양 변경

    // 마우스 다운 - 드래그 시작
    element.addEventListener('mousedown', (e) => {
      dragState.dragging = true;
      dragState.currentElement = element;

      // 현재 위치 계산
      const transform = element.getAttribute('transform') || '';
      const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
      const currentX = match ? parseFloat(match[1]) : 0;
      const currentY = match ? parseFloat(match[2]) : 0;

      // 마우스 오프셋 저장
      const point = convertToSVGPoint(svg, e);
      dragState.offset = {
        x: point.x - currentX,
        y: point.y - currentY
      };
    });
  });

  // === 4. 마우스 이동 - 요소 이동 ===
  svg.addEventListener('mousemove', (e) => {
    if (!dragState.dragging) return;

    // SVG 좌표계로 변환
    const point = convertToSVGPoint(svg, e);

    // 새 위치 계산
    let newX = point.x - dragState.offset.x;
    let newY = point.y - dragState.offset.y;

    // Grid Snap 적용
    if (dragState.gridSnap) {
      newX = Math.round(newX / dragState.gridSize) * dragState.gridSize;
      newY = Math.round(newY / dragState.gridSize) * dragState.gridSize;
    }

    // Transform 업데이트
    const transform = `translate(${newX},${newY})`;
    dragState.currentElement.setAttribute('transform', transform);

    // 캔버스 확장 (필요 시)
    expandCanvasIfNeeded(svg, dragState.currentElement);
  });

  // === 5. 마우스 업 - 드래그 종료 ===
  svg.addEventListener('mouseup', async () => {
    if (dragState.dragging) {
      // 레이아웃 저장
      await saveLayout(svg, dragState.diagramHash);

      // 상태 초기화
      dragState.dragging = false;
      dragState.currentElement = null;
    }
  });
}
```

#### 📌 **캔버스 자동 확장 (1500-1600줄)**

```javascript
function expandCanvasIfNeeded(svg, element) {
  // 1. 현재 viewBox 가져오기
  let viewBox = svg.getAttribute('viewBox');
  let [vbX, vbY, vbWidth, vbHeight] = viewBox ?
    viewBox.split(' ').map(parseFloat) : [0, 0, 800, 600];

  // 2. 요소의 위치 계산
  const bbox = element.getBBox();
  const transform = element.getAttribute('transform') || '';
  const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
  const x = match ? parseFloat(match[1]) : 0;
  const y = match ? parseFloat(match[2]) : 0;

  const elementLeft = x + bbox.x;
  const elementRight = x + bbox.x + bbox.width;
  const elementTop = y + bbox.y;
  const elementBottom = y + bbox.y + bbox.height;

  // 3. 패딩 (요소가 가장자리에서 얼마나 떨어져야 하는지)
  const padding = 100;

  // 4. 확장 필요한지 확인
  let needsExpansion = false;

  // 왼쪽으로 확장 필요?
  if (elementLeft < vbX + padding) {
    vbX = elementLeft - padding;
    vbWidth += (원래 vbX - 새 vbX);
    needsExpansion = true;
  }

  // 오른쪽, 위, 아래도 동일하게 확인...

  // 5. 확장 적용
  if (needsExpansion) {
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbWidth} ${vbHeight}`);
    svg.setAttribute('width', vbWidth);
    svg.setAttribute('height', vbHeight);
  }
}
```

#### 📌 **레이아웃 저장/복원 (1300-1450줄)**

```javascript
// Chrome Storage에 레이아웃 저장
async function saveLayout(svg, diagramHash) {
  const layout = {};

  // 모든 transform 속성 수집
  svg.querySelectorAll('[transform*="translate"]').forEach(element => {
    const id = generateElementId(element);  // 요소 식별자 생성
    const transform = element.getAttribute('transform');
    layout[id] = transform;
  });

  // Storage에 저장
  await chrome.storage.local.set({
    [`layout_${diagramHash}`]: layout
  });
}

// 저장된 레이아웃 복원
async function restoreLayout(diagramHash) {
  const result = await chrome.storage.local.get(`layout_${diagramHash}`);
  const layout = result[`layout_${diagramHash}`];

  if (!layout) return;

  // 각 요소에 저장된 transform 적용
  Object.entries(layout).forEach(([id, transform]) => {
    const element = findElementById(id);
    if (element) {
      element.setAttribute('transform', transform);
    }
  });
}
```

#### 📌 **Export 기능 (400-600줄)**

```javascript
// PNG 내보내기
async function exportAsPNG() {
  const svg = preview.querySelector('svg');

  // SVG → Canvas 변환
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // 2배 확대 (고해상도)
  canvas.width = svgWidth * 2;
  canvas.height = svgHeight * 2;

  // SVG를 이미지로 그리기
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

  await img.decode();
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // PNG 다운로드
  const link = document.createElement('a');
  link.download = `${diagramTitle}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// PDF 내보내기 (jsPDF 사용)
async function exportAsPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [svgWidth, svgHeight]
  });

  // SVG를 이미지로 변환하여 PDF에 추가
  pdf.addImage(imgData, 'PNG', 0, 0, svgWidth, svgHeight);
  pdf.save(`${diagramTitle}.pdf`);
}
```

---

### 3. `src/editor/mermaid-init.js` - Mermaid 초기화

```javascript
// Mermaid 로딩 완료를 알리는 Promise
window.mermaidReady = new Promise((resolve, reject) => {
  const initMermaid = () => {
    if (typeof window.mermaid !== 'undefined') {
      // Mermaid 설정
      window.mermaid.initialize({
        startOnLoad: false,       // 자동 렌더링 비활성화
        theme: 'default',         // 테마
        securityLevel: 'loose',   // 보안 레벨 (HTML 허용)
        logLevel: 'error'         // 에러만 로그
      });

      resolve(window.mermaid);    // Promise 완료
    } else {
      reject(new Error('Mermaid library not loaded'));
    }
  };

  // DOM 로딩 대기
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMermaid);
  } else {
    initMermaid();
  }
});
```

---

### 4. `src/content/content.js` - 웹페이지에 주입되는 스크립트

```javascript
// 웹페이지의 Mermaid 코드 블록을 자동으로 다이어그램으로 렌더링

// 1. Mermaid 코드 블록 찾기
const codeBlocks = document.querySelectorAll('code.language-mermaid, pre.mermaid');

codeBlocks.forEach(block => {
  // 2. Mermaid 코드 추출
  const code = block.textContent;

  // 3. SVG 렌더링
  mermaid.render('diagram-' + id, code).then(({ svg }) => {
    // 4. 원래 코드 블록을 SVG로 교체
    block.parentElement.innerHTML = svg;
  });
});
```

---

### 5. `src/background/service-worker.js` - Background Service

```javascript
// Extension 설치 시
chrome.runtime.onInstalled.addListener(() => {
  // 우클릭 메뉴 추가
  chrome.contextMenus.create({
    id: 'create-diagram',
    title: 'Create Mermaid Diagram',
    contexts: ['selection']  // 텍스트 선택 시 표시
  });
});

// 메뉴 클릭 시
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'create-diagram') {
    // 선택한 텍스트로 다이어그램 에디터 열기
    const selectedText = info.selectionText;
    chrome.tabs.create({
      url: `src/editor/editor.html?code=${encodeURIComponent(selectedText)}`
    });
  }
});
```

---

## 🔑 핵심 개념 설명

### SVG Transform

```javascript
// SVG 요소의 위치는 transform 속성으로 관리
<g transform="translate(100, 200)">  // x=100, y=200으로 이동
  <rect width="50" height="50"/>
</g>

// JavaScript로 위치 변경
element.setAttribute('transform', `translate(${newX}, ${newY})`);
```

### SVG 좌표계 변환

```javascript
// 마우스 이벤트의 clientX, clientY는 화면 좌표
// SVG 내부 좌표계로 변환 필요

const svgPoint = svg.createSVGPoint();
svgPoint.x = e.clientX;
svgPoint.y = e.clientY;

const ctm = svg.getScreenCTM();  // 화면→SVG 변환 매트릭스
const point = svgPoint.matrixTransform(ctm.inverse());

// 이제 point.x, point.y는 SVG 좌표계의 좌표
```

### Chrome Storage API

```javascript
// 저장
await chrome.storage.local.set({
  'key': 'value'
});

// 읽기
const result = await chrome.storage.local.get('key');
console.log(result.key);  // 'value'
```

### SHA-256 해시 (다이어그램 식별)

```javascript
// 같은 Mermaid 코드 → 같은 해시
// 다른 Mermaid 코드 → 다른 해시

async function generateHash(code) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 사용 예:
const hash = await generateHash('graph TD\n A-->B');
// → 'a3f2e1b...' (64자 16진수)

// 레이아웃 저장 키: `layout_${hash}`
```

---

## 🎨 주요 기능별 코드 위치

| 기능 | 파일 | 함수/줄 번호 |
|------|------|--------------|
| **Drag Mode** | editor.js | makeNodesDraggable (993-1160) |
| **Canvas 확장** | editor.js | expandCanvasIfNeeded (1477-1732) |
| **레이아웃 저장** | editor.js | saveLayout (1347-1390) |
| **레이아웃 복원** | editor.js | restoreLayout (1392-1424) |
| **PNG 내보내기** | editor.js | exportAsPNG (400-450) |
| **PDF 내보내기** | editor.js | exportAsPDF (452-550) |
| **미리보기 렌더링** | editor.js | updatePreview (185-245) |
| **Grid Snap** | editor.js | toggleGridSnap (1446-1464) |

---

## 🐛 현재 알려진 문제

1. ~~Edge 자동 재연결이 부정확함~~ → 제거됨
2. ~~무한 캔버스 확장~~ → 해결 예정 (최대 크기 제한)
3. Grid Snap은 Drag Mode 활성화 후에만 작동

---

## 💡 사용자 정의 가이드

### Drag Mode 수정

`editor.js`의 `makeNodesDraggable` 함수를 수정하세요:

```javascript
// 993줄부터
function makeNodesDraggable(svg) {
  // 여기에 커스텀 로직 추가
}
```

### 새로운 Export 형식 추가

`editor.js`에 새 함수 추가:

```javascript
async function exportAsJPEG() {
  // PNG와 유사하게 구현
  const canvas = ...;
  const jpegData = canvas.toDataURL('image/jpeg', 0.9);
  // ...
}

// HTML에 버튼 추가
<button onclick="exportAsJPEG()">Export JPEG</button>
```

---

## 📚 참고 자료

- [Mermaid 공식 문서](https://mermaid.js.org/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)
- [SVG Transform 튜토리얼](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform)
- [jsPDF 문서](https://github.com/parallax/jsPDF)

---

이 문서는 프로젝트 전체를 이해하고 수정하는 데 도움이 되도록 작성되었습니다.
질문이 있으시면 언제든 물어보세요!
