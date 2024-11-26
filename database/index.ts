import { Database } from "duckdb-async";
import Keyv from "@keyvhq/core";
import { LocalDatabase } from "../src/types";

async function initDatabase(): Promise<Database> {
  const db = await Database.create(":memory:");

  return db;
}

export function initLocalDatabase(): LocalDatabase {
  const db: LocalDatabase = {
    matches: new Keyv(),
    players: new Keyv(),
    league: new Keyv(),
  };

  return db;
}

export default initDatabase;
