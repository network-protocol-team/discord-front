# Discord 프론트

## 사용 환경

사용한 환경과 버전은 다음과 같습니다.

- Node.js: 21.6.2
- npm: 9.9.3

그 외의 버전은 package.json 을 참고해주세요.

## 빌드 및 실행 방법

개발 서버를 오픈하는 것은 다음 순서에 따르면 됩니다.

### git clone

현재 레포지토리 (network-protocol-team/discord-front) 의 **develop** 브랜치를 clone 해주세요

```bash
git clone https://github.com/network-protocol-team/discord-front.git
```

### .env 파일 수정

서버 주소에 따라 .env 파일의 내용을 수정해야 합니다.

먼저, 현재 자신의 ip 주소를 확인하고, 이를 .env 파일에 적용해주세요.

```text
VITE_SERVER_URL = 'http://<이 부분 수정>:8080'
VITE_SOCK_URL = 'ws://<이 부분 수정>:8080/ws'
```

예를 들어, 자신의 ip 주소가 `172.16.167.180` 라면, 다음과 같이 적으면 됩니다.

```text
VITE_SERVER_URL = 'http://172.16.167.180:8080'
VITE_SOCK_URL = 'ws://172.16.167.180:8080/ws'
```

### node_modules 설치

다음 명령어를 입력하여 필요한 모듈들을 다운받습니다.

```bash
npm i
```

### vite 실행

다음 명령어를 입력하여 vite 서버를 실행시킵니다.

```bash
npm run dev
```

그러면, `http://localhost:5173` 으로 접속할 수 있습니다.

## ⭐주의사항⭐

- ⭐**반드시 localhost 에서 실행해주세용**~♥️♥️⭐
- ⭐영상이 잘 로드 되지 않는 경우는 인터넷 불안정 문제이니, **새로고침** 부탁드립니다🙏🙏⭐
- 백엔드 서버를 먼저 띄우고 프론트를 실행해주세요~
- 항상 감사드립니다!

### Mac을 사용하시는 경우

- (Mac에서만 가능한 이스터에그) 심심하시다면 화면을 향해 브이✌️~ 해주세요. 뭔가 재밌는 이펙트가 발생할지도 모릅니다🎈 ㅎㅎ (안되면, 죄송합니다)
