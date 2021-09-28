<h1 align="center">column-name-auto-generator backend server</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
</p>

## Install

```sh
npm install
```

## Usage

1. edit .env

```
GOOGLE_APPLICATION_CREDENTIALS= <gcp-service-account-credentials-json-filepath>
PROJECT_ID= <gcp-project-id>
LOCATION= <gcp-location>
DATASET_ID= <bigquery-dataset-id>
TABLE_ID= <bigquery-table-id>
```

2. start node.js

```sh
npm run start
```

## Show your support

Give a ⭐️ if this project helped you!

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_