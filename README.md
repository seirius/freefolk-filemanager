## Server config
| Name  | Default  | Description  |
|---|---|---|
| PORT  | 3000  | Http server port  |
---

## Filemanager config
| Name  | Default  | Description  |
|---|---|---|
| FILE_DIRECTORY  | /usr/src/app/files | File path for storage  |
| FILE_DIRECTORY_TMP  | /usr/src/app/files/tmp | tmp file path  |
| EXPIRATION_TIME  | 360 | File expiration in seconds  |
---

## Redis config
| Name  | Default  | Description  |
|---|---|---|
| REDIS_HOST  | localhost | Redis host  |
| REDIS_PORT  | 6379 | Redis port  |
| REDIS_FILE_DB  | 0 | Redis database  |
---

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```