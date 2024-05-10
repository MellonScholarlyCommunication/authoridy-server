const fetch = require('node-fetch');
const log4js = require('log4js');
const logger = log4js.getLogger();
const ZENODO_BASE_URL = 'https://zenodo.org/api/records';

async function handle(id,date) {
    const parsedId = parseId(id);
    const filterDate = parseDate(date);

    const url = `${ZENODO_BASE_URL}?q=metadata.creators.person_or_org.identifiers.identifier%3A${parsedId}`;

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
        const hits = json['hits']['hits'];

        if (hits.length == 0) {
            return null;
        }

        for (let i = 0 ; i < hits.length ; i++) {
            const hit = hits[i];
            const page = hit['links']['self_html'];
            const date_updated = hit['updated'].substring(0,10);
            const year = hit['metadata']['publication_date'].substring(0,4);
            const doi = hit['doi_url'];

            const record = {
                'contribution-page': page,
                'accession-date': date_updated
            };

            if (year) {
                record['publication-date'] = year
            }

            if (doi) {
                record['cite-as'];
            }

            if (filterDate === '*') {
                result['contributions'].push(record);
            }
            else if (date_updated.localeCompare(filterDate)>=0) {
                result['contributions'].push(record); 
            }
        }

        return result;
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
