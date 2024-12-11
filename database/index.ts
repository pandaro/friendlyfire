import { Database } from "duckdb-async";
import Keyv from "@keyvhq/core";
import { LocalDatabase } from "../src/types";
import KeyvFile from "@keyvhq/file";

async function initDatabase(): Promise<Database> {
  const db = await Database.create(":memory:");

  return db;
}

export function initLocalDatabase(): LocalDatabase {
  const db: LocalDatabase = {
    matches: new Keyv({store: new KeyvFile("./storage/matches.json")}),
    players: new Keyv({store: new KeyvFile("./storage/players.json")}),
    league: new Keyv({store: new KeyvFile("./storage/league.json")}),
  };

  return db;
}

export default initDatabase;
