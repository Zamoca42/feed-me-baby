<img src="https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/0d10467a-b672-4e24-a2a8-049d31b62e23" alt="feed-me-baby" width="100%" />

# Feed Me Baby :sushi:

**메뉴 고르는 게 가장 힘든 당신에게! :eyes:**

우리 서비스는 공공데이터를 활용하여, 더 나은 다양한 음식 경험을 제공하고자 노력합니다.<br>
Feed Me Baby는 사용자 위치에 맞게 맛집 및 메뉴를 추천하며, 또한 지역 음식점 목록을 자동으로 업데이트 하고 이를 활용합니다.

<br>

## 목차 :clipboard:

- [Feed Me Baby :sushi:](#feed-me-baby-sushi)
  - [목차 :clipboard:](#목차-clipboard)
  - [개요](#개요)
  - [사용 기술](#사용-기술)
  - [프로젝트 진행 및 이슈 관리](#프로젝트-진행-및-이슈-관리)
  - [모델링](#모델링)
  - [맛집 목록 확장성 및 검증](#맛집-목록-확장성-및-검증)
  - [Did You Know](#did-you-know)
  - [API Endpoint](#api-endpoint)
  - [API Reference](#api-reference)
  - [파일 구조](#파일-구조)
  - [팀원](#팀원)
  - [참고자료](#참고자료)

<br/>

## 개요

본 서비스는 사용자가 관심 있는 지역 및 음식 카테고리에 따라 맞춤형 맛집 정보를 한눈에 볼 수 있도록 해주는 어플리케이션입니다.

이 서비스는 방문자 수, 리뷰 평점, 인기 메뉴 등의 필터링 옵션을 제공함으로써 사용자가 보다 세밀한 기준으로 맛집을 탐색하고 결정할 수 있도록 지원합니다.
이를 통해 사용자는 자신의 취향과 요구에 부합하는 최적의 식당을 효율적으로 찾아내는 경험을 할 수 있습니다.

또한, 본 서비스는 점심추천서비스를 통해, 주변 맛집을 사용자에게 제공합니다.
이와 같이 직관적이고 종합적인 맛집 검색 기능을 제공하여 사용자의 음식 탐색과 선택 과정을 간소화하고, 식도락에 관한 풍부한 정보를 신속하게 제공하는 것이 본 서비스의 핵심 목적입니다.

<br/>

## 사용 기술

<br/>

언어 및 프레임워크

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

<br/>

데이터 베이스

![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

<br/>

문서화

![Swagger](https://img.shields.io/badge/swagger-%23Clojure.svg?style=for-the-badge&logo=swagger&logoColor=white)

<br/>

## 프로젝트 진행 및 이슈 관리

[![Notion](https://img.shields.io/badge/Notion-%23000000.svg?style=for-the-badge&logo=notion&logoColor=white)](https://www.notion.so/dev-j/6a83f5bfa7874dc49e4fac30653aaa53?v=25c6ca9163064a8c879dcf124a914f29&pvs=4)

<br/>

## 모델링

![feed-ma-baby-ERD](https://github.com/Zamoca42/blog/assets/96982072/b8624d53-0cfa-470c-a56d-fc2c091c7d26)

## 맛집 목록 확장성 및 검증

- **맛집 목록 가져오기**

  1. 공간 데이터베이스를 사용하는 대신 '위도', '경도' 컬럼에서 해당하는 범위의 데이터를 가져옵니다.
     ![범위 쿼리](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/d651d976-8603-4908-b85a-21798c8d09bd)

  2. 배열 메서드 filter를 이용해서 해당 범위보다 긴 값들을 제외하고 반환 했습니다.
     ![Array.prototype.filter](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/7a7b2d28-ee00-4cc9-90d6-10fea6766ac7)

- **확장성 있는 JSON 반환 타입**

  1. 맛집의 데이터는 이름, 위치, 평점 등이 필요합니다.
  2. 우선은 가시적인 데이터를 볼 수 있게 GeoJson 포맷에 맞춰서 JSON으로 반환합니다.
  3. GeoJson 포맷으로 `GeoJsonResponse`, `GetRestaurantsDto`를 사용하고
     추후 클라이언트 포맷에 맞춰 반환 타입을 변경, 교체할 수 있게 만들었습니다.

- **위도, 경도 범위로 Custom Validation**

  1. 쿼리 파라미터에서 위도, 경도로 위치 값을 숫자 받습니다.
  2. 현재 공공데이터가 경기도 범위인 것을 확인하여 경기도 범위 내의 사용자 위치 값만 받도록 validation을 변경했습니다.

  - 경기도 최남단 위도: 약 36.0도
  - 경기도 최북단 위도: 약 38.0도
  - 경기도 최서단 경도: 약 126.0도
  - 경기도 최동단 경도: 약 128.0도

## Did You Know

- [Custom Validator](https://zamoca42.github.io/blog/js-ts/nest-js/custom-validator.html)
- [맛집 목록 가져와서 지도에 표시하기](https://zamoca42.github.io/blog/js-ts/nest-js/query-range.html)

## API Endpoint

| API              | Endpoint | Method | Feature        |
| ---------------- | -------- | ------ | -------------- |
| restaurant-guide |          | `GET`  | 맛집 목록 조회 |

<br/>

## API Reference

<details>

<summary>Swagger 이미지</summary>

![스크린샷 2023-11-08 오후 8 39 47](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/5b241a91-a740-4ce4-a8df-5452c8f5bec0)
![스크린샷 2023-11-08 오후 8 40 06](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/ee25ff75-0004-4090-bb03-36dbefcff42b)
![스크린샷 2023-11-08 오후 8 40 22](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/1b6dd53b-e0bf-42ed-adb8-1e8b484b91d6)
![스크린샷 2023-11-08 오후 8 40 32](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/649244e7-b2fc-47a4-a83a-33b4654b3342)
![스크린샷 2023-11-08 오후 8 40 49](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/fde22e26-db52-4d64-8b3e-4a89d8e688bb)
![스크린샷 2023-11-08 오후 8 41 02](https://github.com/pre-onboarding-backend-G/feed-me-baby/assets/96982072/31e41731-2e58-464b-a0c6-5a8b10ce5889)

</details>

<br/>

## 파일 구조

<details>
<summary> 파일 구조 보기 </summary>

```text
src
├── restaurant
│   ├── controller
│   ├── service
│   ├── entity
│   ├── repository
│   ├── dto
│   ├── scheduler
│   └── test
├── restaurant-guide
│   ├── controller
│   ├── service
│   ├── repository
│   ├── dto
│   └── test
├── review
│   ├── controller
│   ├── service
│   ├── entity
│   ├── repository
│   ├── dto
│   ├── decorator
│   ├── entitiy
│   ├── repository
│   └── test
├── user
│   ├── controller
│   ├── service
│   ├── entity
│   ├── repository
│   ├── dto
│   ├── decorator
│   └── test
├── auth
│   ├── controller
│   ├── service
│   ├── guard
│   ├── dto
│   ├── decorator
│   └── test
├── common
│   ├── env-validation
│   ├── exception-filter
│   ├── logger
│   └── response-entity
└── migration
```

</details>

<br/>

## 팀원

<div align="center">

<br/>

![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)<br>
<a href="https://github.com/zamoca42">추연규</a> <a href="https://github.com/refigo">고미종</a> <a href="https://github.com/msleeffice">이명석</a> <a href="https://github.com/Sangun-Lee-6">이상운</a> <a href="https://github.com/hojoonSong">송호준</a>

</div>

<br/>

## 참고자료

<details>
<summary>Unit Test</summary>

- [효율적인 테스트를 위한 stub 객체 활용법](https://medium.com/daangn/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9D%B8-%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%A5%BC-%EC%9C%84%ED%95%9C-stub-%EA%B0%9D%EC%B2%B4-%ED%99%9C%EC%9A%A9%EB%B2%95-5c52a447dfb7)
- [테스트하기 좋은 코드 - 외부에 의존하는 코드 개선](https://jojoldu.tistory.com/680)
- [Stub을 이용한 Service 계층 단위 테스트하기](https://jojoldu.tistory.com/637)

</details>

<details>
<summary>Library</summary>

- [custom-validation-classes](https://github.com/typestack/class-validator#custom-validation--classes)

</details>
