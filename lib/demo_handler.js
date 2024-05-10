async function handle(id,date) {
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

module.exports = { handle };