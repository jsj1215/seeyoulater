# seeyoulater frontend

seeyoulater의 웹 클라이언트입니다. React 19, Vite, React Router 7, axios, zustand로 만들었고 `vite-plugin-pwa`로 설치형 앱(PWA)과 공유 대상(Share Target)을 지원합니다.

프로젝트 전체 소개와 백엔드 실행 방법은 [상위 README](../README.md)를 참고하세요.

## 실행

```bash
npm install
npm run dev
```

- 개발 서버는 Vite 기본 포트 `http://localhost:5173`에서 열립니다.
- `/api`로 시작하는 요청은 `vite.config.ts`의 프록시 설정에 따라 `http://localhost:8080`(백엔드)으로 전달됩니다. 백엔드를 먼저 실행해 두세요.

## 빌드와 린트

```bash
npm run build   # 타입 체크(tsc -b) 후 dist/ 에 정적 파일 생성
npm run lint    # ESLint
```

## PWA 캐시 정책

서비스 워커는 빌드된 정적 자산만 precache합니다. `/api` 응답은 개인 데이터라 캐시하지 않으며, 로그아웃할 때 브라우저의 Cache Storage도 비웁니다.
