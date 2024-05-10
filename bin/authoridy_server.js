#!/usr/bin/env node

const fs = require('fs');
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

    try {
        const handler = HANDLERS[path['handler']];

        const body = await handler(path['contributorID'], path['sinceDate']);

        if (body) {
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify(body,null,2));
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
    const contributorID = rest.join("/");

    if (! handler || ! sinceDate || ! contributorID) {
        return null;
    }

    if (sinceDate.match(/^(\*|\d{8})$/)) {
        return { handler: handler , sinceDate: sinceDate, contributorID: contributorID }
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
