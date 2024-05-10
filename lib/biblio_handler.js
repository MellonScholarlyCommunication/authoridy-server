const fetch = require('node-fetch');
const log4js = require('log4js');
const logger = log4js.getLogger();
const BIBLIO_BASE_URL = 'https://biblio.ugent.be';

async function handle(id,date) {
    const filterDate = parseDate(date);

    const url = `${BIBLIO_BASE_URL}/person/${id}/publication/export?format=json`;

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
        const lines = body.split("\n");
        const result = {
            "contributor": id ,
            "contributions": []
        };

        for (let i = 0 ; i < lines.length ; i++) {
            if (lines[i].length) {
                const data = JSON.parse(lines[i]);
                const biblio_id = data['biblio_id'];
                const date_updated = data['date_updated']?.substring(0,10);
                const year = data['year'];
                const handle = data['handle'];
                const doi = data['doi'];

                const record = {
                    'contribution-page': `${BIBLIO_BASE_URL}/publication/${biblio_id}`,
                    'accession-date': date_updated
                };

                if (year) {
                    record['publication-date'] = year
                }

                if (doi && doi.length > 0) {
                    if (doi[0].startsWith('http')) {
                        record['cite-as'] = doi[0];
                    }
                    else {
                        record['cite-as'] = 'https://doi.org/' + doi[0];
                    }
                }
                else if (handle) {
                    if (handle.startsWith('http')) {
                        record['cite-as'] = handle; 
                    }
                    else {
                        record['cite-as'] = 'http://hdl.handle.net/' + handle;
                    }
                }

                if (filterDate === '*') {
                    result['contributions'].push(record);
                }
                else if (date_updated.localeCompare(filterDate)>=0) {
                    result['contributions'].push(record); 
                }
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

module.exports = { handle };