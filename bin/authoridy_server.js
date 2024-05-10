#!/usr/bin/env node

const fsPath = require('path');
const { start_server } = require('mellon-server');
const { program } = require('commander');
const log4js = require('log4js');
const logger = log4js.getLogger();

require('dotenv').config();

const HOST = process.env.AUTHORIDY_HOST ?? 'localhost';
const PORT = process.env.AUTHORIDY_PORT ?? 8000;
const PUBLIC_PATH = process.env.AUTHORIDY_PUBLIC_PATH ?? './public';
const AUTHOR_PREFIX = process.env.AUTHORIDY_PREFIX ?? 'author';
const AUTHORIDY_HANDLER = process.env.AUTHORIDY_HANDLER ?? handle;

program
  .name('authoridy-server')
  .version('1.0.0')
  .description('A demonstration authorIDy server');

program
  .command('start-server')
  .option('--host <host>','host',HOST)
  .option('--port <port>','port',PORT)
  .option('--public <public>','public',PUBLIC_PATH)
  .action( (options) => {
    options['registry'] = [{ path : `${AUTHOR_PREFIX}/.*` , do: doAuthorIDy }];
    start_server(options);
  });

program.parse();

async function doAuthorIDy(req,res) {
    if (req.method !== 'GET') {
        logger.error(`tried method ${req.method} on inbox : forbidden`);
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const path = parsePath(req.url);

    if (!path) {
        logger.error(`failed to parse ${req.url}`);
        res.writeHead(400);
        res.end('Bad Request');
        return; 
    }

    try {
        const handler = dynamic_handler(AUTHORIDY_HANDLER);

        const body = await handler(path['contributorID'], path['sinceDate']);

        if (body) {
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify(body,null,2));
        }
        else {
            logger.error(`failed to handle_contributor ${req.url}`);
            res.writeHead(500);
            res.end('Oops');
        }
    }
    catch (e) {
        logger.error(e);
        res.writeHead(500);
        res.end('Oops');
    }
}

function parsePath(url) {
    const parts = url.substring(AUTHOR_PREFIX.length + 2).split("/",2);
    if (parts.length != 2) {
        return null;
    }

    if (parts[0].match(/^(\*|\d{8})$/)) {
        return { sinceDate: parts[0], contributorID: parts[1] }
    }
    else {
        return null;
    }
}

function handle(id,date) {
    return {
        "contributor": id,
        "contributions": [
          {
            "contribution-page": "https://mirepo.org/item/9876",
            "accession-date": "2023-01-04"
          },
          {
            "contribution-page": "https://mirepo.org/item/5432",
            "accession-date": "2022-03-20"
          }
        ]
    };
}

function dynamic_handler(handler,fallback) {
    if (handler) {
        if (typeof handler === 'function') {
            logger.debug(`handler is explicit`);
            return handler;
        }
        else {
            const abs_handler = fsPath.resolve(handler);
            logger.debug(`trying dynamic load of ${handler} -> ${abs_handler}`);
            delete require.cache[abs_handler];
            const func = require(abs_handler).handle;
            return func;
        }
    }
    else {
        logger.debug(`using fallback handler`);
        return fallback;
    }
}