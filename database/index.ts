import duckdb from 'duckdb';

function initDatabase(): duckdb.Database {
const db = new duckdb.Database('https://data-marts.beyondallreason.dev/matches.parquet');

return db;
}

export default initDatabase;