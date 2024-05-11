# authoridy-server

A prototype [authorIDy](https://signposting.org/authorIDy/) server.

## Requirements

- NodeJS
- yarn (`npm install --global yarn`)

## Install

```
yarn
```

## Start

```
yarn server
```

## Configuration

Create an `.env` file which can contain the following parameters:

- `LOG4JS` : the logging leven `info` , `debug`, ...
- `AUTHORIDY_HOST` : the hostname or ip adress to bind to
- `AUTHORIDY_PORT` : the port to open
- `AUTHORIDY_BASE` : the base url of this service
- `AUTHORIDY_PREFIX` : the prefix to use for this service
- `AUTHORIDY_PUBLIC_PATH` : the location of the `public` directory containing static HTML files

The authorIDy will run on `http://${AUTHORIDY_HOST}:${AUTHORIDY_PORT}/${AUTHORIDY_PREFIX}` and
is served to the world as `${AUTHORIDY_BASE}/${AUTHORIDY_PREFIX}`.

## Demo

- http://localhost:8000/author/zenodo/*/https://orcid.org/0000-0001-8390-6171
- http://localhost:8000/author/biblio/20240225/https://orcid.org/0000-0001-8390-6171
- http://localhost:8000/author/github/20240225/https://github.com/phochste
