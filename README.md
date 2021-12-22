# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## 使い方

![画面収録-2021-12-22-10.18.52.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/636318/78e502c5-d4fd-5e1e-9963-9449d4526082.gif)

## 事前準備

* GCPサービスアカウント
GCPサービスアカウントを作成して、jsonのキーファイルをkeysに配置しておきます。
https://cloud.google.com/iam/docs/creating-managing-service-account-keys

* codic api
codic apiを呼び出すためにアクセストークンを作成しておきます。
https://codic.jp/docs/api

以下を.envを作ります。適宜、プレースホルダーを埋めてください。

```
FRONTEND_PORT=3000
FRONTEND_CONTAINER_NAME=column-generator-frontend

REACT_APP_CODIC_URL=https://codic.jp/
REACT_APP_CODIC_API_URL=https://api.codic.jp/
REACT_APP_CODIC_API_REQUEST_MAX_LENGTH=24
REACT_APP_CODIC_PROJECT_ID= <codic-project-id>
REACT_APP_CODIC_API_TOKEN= <codic-api-token>

BACKEND_CONTAINER_NAME=column-generator-backend
BACKEND_PORT=3001

GOOGLE_APPLICATION_CREDENTIALS= /app/keys/<gcp-service-account-credentials-json-filepath>
PROJECT_ID= <gcp-project-id>
LOCATION= <gcp-location>
DATASET_ID= <bigquery-dataset-id>
```

## Dockerコンテナでアプリケーションを立ち上げる

docker-composeでフロントエンドとバックエンドのコンテナを構築して、立ち上げると簡単です。
```
docker-compose up --build
```

## 個別に立ち上げるとき

フロントエンドはトップディレクトリ、バックエンドは`server`ディレクトリで次で実行できます。

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
