import { Database} from 'duckdb-async';

async function initDatabase(): Promise<Database> {
const db = await Database.create(':memory:');   

return db;
}

export default initDatabase;