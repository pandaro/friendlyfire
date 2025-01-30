import { Database } from "duckdb-async";
import Keyv from "@keyvhq/core";
import { LocalDatabase } from "../src/types";
import KeyvFile from "@keyvhq/file";
import { GetLeagueData, SetLeagueData, SetPlayerData } from "./localQueries";
import { _playersTrackedParsed } from "..";
import config from "../config";

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

export async function AddPlayerToDatabase(db: LocalDatabase, playerId: string, playerName: string) {
  console.log(`Adding ${playerId} - ${_playersTrackedParsed[playerId]} to database`);
  const _p = { name: playerName, won:0, lost:0, points: config.initialPlayersPoints ?? 0, maps: {}, teamMates: {}, wins: {}, losses: {}, mode:{}, encounters:{} };
  await SetPlayerData(db.players, _p, playerId);

  await AddPlayerToLeaderboard(playerId, _p.points, db);
}

async function AddPlayerToLeaderboard(playerId: string, p: number, db: LocalDatabase) {
  console.log(`Adding ${playerId} - ${_playersTrackedParsed[playerId]} to leaderboard`);
  const league = await GetLeagueData(db.league, "league");
  league.leaderboard.push({ userId: playerId, points: p });

  await SetLeagueData(db.league, league, "league");
}

export default initDatabase;
