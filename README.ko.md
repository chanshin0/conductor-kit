# conductor-kit

> 여러 AI 에이전트(Claude Code · Codex CLI · Cursor) 를 하나의 팀 워크플로우로 지휘하는 멀티 에이전트 오케스트레이션 킷.

🇬🇧 [English version](./README.md)

**Status**: 🚧 초기 개발 중. `v0.1.0` 이전까지 API · CLI 네이밍은 바뀔 수 있다.

## 왜 필요한가

여러 AI 코딩 에이전트를 도입한 팀은 워크플로우가 조각난다 — 같은 Jira 이슈를 한 브랜치에서는 Claude, 다른 브랜치에서는 Cursor, 세 번째 터미널에서는 Codex CLI 가 처리하고, 각자 다른 프롬프트·컨벤션·셸 스크립트를 쓴다. `conductor-kit` 은 워크플로우 자체를 중립 CLI 로 분리해 에이전트를 교체 가능한 부품으로 만든다.

- **단일 CLI 코어** (`conductor`) 가 Jira 전환, 브랜치 네이밍, GitLab MR 생성, 검증, 상태 파일을 결정적으로 처리한다.
- **얇은 에이전트 어댑터** (Claude Code · Codex CLI · Cursor) 가 stdin JSON 프로토콜로 CLI 에 호출만 한다 — 프롬프트 중복 없음.
- **이슈당 하나의 상태 파일** (`.work/{KEY}.md`) — 한 에이전트에서 멈추고 다른 에이전트에서 이어받는 게 자연스럽게 된다.
- **저작자 푸터** 가 모든 MR · Jira 코멘트 · Recap 에 실제로 어떤 에이전트·모델이 작업했는지 남긴다.

## 빠른 시작 (초안)

```sh
# 중립 CLI 를 전역 설치
npm install -g @conductor-kit/cli

# 사용할 에이전트 어댑터 설치
npx @conductor-kit/install --agent claude   # 또는: --agent codex / --agent cursor / --agent all

# Jira 이슈 전주기 실행
conductor init --project-key MYKEY
conductor pick MYKEY-123
# ... 구현 ...
conductor ship
conductor land
conductor recap
```

## 커맨드

| CLI                                      | 역할                                                       |
| ---------------------------------------- | ---------------------------------------------------------- |
| `conductor init`                         | 현재 저장소에 `.conductor/` 스캐폴드 생성                  |
| `conductor pick <KEY>`                   | Jira 이슈 조회 → 브랜치 생성 → 상태 전환 → 플랜 초안 작성   |
| `conductor ship`                         | 검증 → 커밋 → 푸시 → MR 등록 → Jira 코멘트                  |
| `conductor land [<KEY>]`                 | 머지 후 Resolved 로 전환 + 로컬 브랜치 정리                 |
| `conductor recap [<KEY>] [--confluence]` | 결과 코멘트 / Confluence 페이지 초안 발행                   |
| `conductor draft "<desc>"`               | 중복 탐지 포함 신규 Jira 이슈 초안                          |
| `conductor where`                        | 현재 상태 스냅샷                                            |
| `conductor tune "<feedback>"`            | 워크플로우 피드백 분류 + 수정안 제안                        |
| `conductor autopilot <KEY\|desc>`        | pick → 구현 → ship 루프                                    |

## 아키텍처

```
conductor-kit/
├── packages/core/        # @conductor-kit/core   — 순수 도메인 로직
├── packages/cli/         # @conductor-kit/cli    — `conductor` 바이너리
├── packages/assets/      # @conductor-kit/assets — 템플릿·기본값·레퍼런스
├── packages/agent-claude # Claude Code 플러그인 (CLI 위임형)
├── packages/agent-codex  # Codex CLI 번들 (AGENTS.md + 프롬프트)
├── packages/agent-cursor # Cursor 번들 (.cursor/rules + commands)
└── apps/installer        # `npx @conductor-kit/install`
```

`docs/ARCHITECTURE.md` 가 올라오면 거기서 상세 확인.

## 기여

[CONTRIBUTING.md](./CONTRIBUTING.md) 참조. 이 프로젝트는 [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md) 을 따른다.

## 라이선스

[MIT](./LICENSE) © Dongchan Shin (chanshin0)
