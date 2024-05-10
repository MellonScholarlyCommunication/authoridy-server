#!/usr/bin/env node

const fs = require('fs');
const nodeUrl = require('url');
const fsPath = require('path');
const { start_server } = require('mellon-server');
const { program } = require('commander');
const log4js = require('log4js');

require('dotenv').config();

const logger = getLogger();

function getLogger() {
    const logger = log4js.getLogger();

    if (process.env.LOG4JS) {
        log4js.configure({
            appenders: {
            stderr: { type: 'stderr' }
            },
            categories: {
            default: { appenders: ['stderr'], level: process.env.LOG4JS }
            }
        });
    }

    return logger;
}

const HOST = process.env.AUTHORIDY_HOST ?? 'localhost';
const PORT = process.env.AUTHORIDY_PORT ?? 8000;
const BASE = process.env.AUTHORIDY_BASE ?? `http://localhost:${PORT}`;
const PUBLIC_PATH = process.env.AUTHORIDY_PUBLIC_PATH ?? './public';
const AUTHOR_PREFIX = process.env.AUTHORIDY_PREFIX ?? 'author';

let HANDLERS = {};

program
  .name('authoridy-server')
  .version('1.0.0')
  .description('A demonstration authorIDy server');

program
  .command('start-server')
  .option('--host <host>','host',HOST)
  .option('--port <port>','port',PORT)
  .option('--base <base>','base',BASE)
  .option('--public <public>','public',PUBLIC_PATH)
  .argument('<handlers>','handlers')
  .action( (handlers,options) => {
    // Dynamically load all handlers
    HANDLERS = JSON.parse(fs.readFileSync(handlers, { encoding: 'utf-8'}));
    for (let key in HANDLERS) {
        const path = HANDLERS[key];
        const handler = dynamic_handler(path,null);
        HANDLERS[key] = handler;   
    }
    options['registry'] = [{ path : `${AUTHOR_PREFIX}/.*` , do: doAuthorIDy }];
    start_server(options);
  });

program.parse();

// req = IncomingMessage
// res = ServerResponse 
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
        res.end('Invalid url format');
        return; 
    }

    logger.debug(path);

    try {
        const handler = HANDLERS[path['handler']];

        const result = await handler(path['contributorID'], path['sinceDate'], path['query']);

        if (result) {
            res.setHeader('Content-Type','application/json');
            const linkHeaders = [];
            if (result['prev']) {
                linkHeaders.push(`<${BASE}${req.url}?${result['prev']}>; rel="prev"`);
            }
            if (result['next']) {
                linkHeaders.push(`<${BASE}${req.url}?${result['next']}>; rel="next"`);
            }
            if (linkHeaders.length) {
                res.setHeader('Link',linkHeaders);
            }
            res.end(JSON.stringify(result['result'],null,2));
        }
        else {
            logger.error(`failed to handle_contributor ${req.url}`);
            res.writeHead(404);
            res.end('Unknown contributor identifier');
        }
    }
    catch (e) {
        logger.error(e);
        res.writeHead(500);
        res.end('Oops');
    }
}

function parsePath(url) {
    const [handler, sinceDate, ...rest] = url.substring(AUTHOR_PREFIX.length + 2).split("/");
    const path = rest.join("/");

    if (! handler || ! sinceDate || ! path) {
        return null;
    }

    const [contributorID, ..._rest2] = path.split("?");

    const query = nodeUrl.parse(url, true).query;

    if (sinceDate.match(/^(\*|\d{8})$/)) {
        return { 
            handler: handler , 
            sinceDate: sinceDate, 
            contributorID: contributorID,
            query: query
        };
    }
    else {
        return null;
    }
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
