const fetch = require('node-fetch');
const log4js = require('log4js');
const logger = log4js.getLogger();
const GITHUB_BASE_URL = 'https://api.github.com';

const PAGE_LENGTH = 10;

async function handle(id,date,query) {
    const parsedId = parseId(id);
    const filterDate = parseDate(date);

    let url = `${GITHUB_BASE_URL}/users/${parsedId}/repos?sort=updated&per_page=${PAGE_LENGTH}`;

    if (query?.page) {
        url += `&page=${query.page}`;
    }

    logger.debug(url);

    const res = await fetch(url);

    if (!res.ok) {
        logger.error(`failed to contact ${url}`);
        return null;
    }

    const body = await res.text();

    if (! body) {
        return null;
    }

    try {
        const result = {
            "contributor": id ,
            "contributions": []
        };

        const json = JSON.parse(body);

        if (json.length == 0) {
            return null;
        }

        let weHaveAll = false;

        for (let i = 0 ; i < json.length ; i++) {
            const hit = json[i];
            const page = hit['html_url'];
            const date_updated = hit['updated_at'].substring(0,10);
            const year = hit['created_at'].substring(0,4);

            const record = {
                'contribution-page': page,
                'accession-date': date_updated
            };

            if (year) {
                record['publication-date'] = year
            }

            if (filterDate === '*') {
                result['contributions'].push(record);
            }
            else {
                if (date_updated.localeCompare(filterDate)>=0) {
                    result['contributions'].push(record); 
                }
                else {
                    weHaveAll = true;
                }
            }
        }

        const response = { result: result };

        if (weHaveAll || result['contributions'].length < 10) {
            if (query?.page && query?.page > 0) {
                response['prev'] = `page=${Number(query.page) - 1}`;
            }

            return response;
        }
        else {
            
            if (query?.page && query?.page > 0) {
                response['prev'] = `page=${Number(query.page) - 1}`;
                response['next'] = `page=${Number(query.page) + 1}`;
            }
            else {
                response['next'] = `page=2`; 
            }
            return response;
        }
    }
    catch (e) {
        logger.error(`handler failed for ${id}:${date}`);
        logger.error(e);
        return null;
    }

    return { ok:1};
}

function parseDate(date) {
    if (date === '*') {
        return date;
    }

    const year  = date.substring(0,4);
    const month = date.substring(4,6);
    const day   = date.substring(6);

    return `${year}-${month}-${day}`;
}

function parseId(id) {
     return id.replaceAll(/^.*\//g,'');
}

module.exports = { handle };