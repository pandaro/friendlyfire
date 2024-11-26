import { Store } from "@keyvhq/core";
import { LocalLeague, LocalMatch, LocalPlayer } from "../src/types";
import { BigIntStringify } from "../src/utils/json";

export async function SetMatchData(
  db: Store<any>,
  matchData: LocalMatch,
  matchId: string
) {
  await db.set(matchId, JSON.stringify(matchData, BigIntStringify));
}

export async function GetMatchData(
  db: Store<any>,
  matchId: string
): Promise<LocalMatch> {
  const matchData = await db.get(matchId);

  return matchData;
}

export async function SetPlayerData(
  db: Store<any>,
  playerData: LocalPlayer,
  playerId: string
) {
  await db.set(playerId, playerData);
}

export async function GetPlayerData(
  db: Store<any>,
  playerId: string
): Promise<LocalPlayer> {
  const playerData = await db.get(playerId);

  return playerData;
}

export async function SetLeagueData(
  db: Store<any>,
  leagueData: LocalLeague,
  leagueId: string
) {
//   console.log("setting league", leagueData);
  const _parsedLeagueData = {
    lastMatchId: leagueData.lastMatchId.toString(),
    lastMatchStartTime: leagueData.lastMatchStartTime.toString(),
    leaderboard: leagueData.leaderboard
  }
  await db.set(leagueId, _parsedLeagueData);
}

export async function GetLeagueData(
  db: Store<any>,
  leagueId: string
): Promise<LocalLeague> {
  // if store doesn't have league data, create it
  const _league = await db.get(leagueId);
  if (!_league) {
    await db.set(leagueId, {
      lastMatchId: "",
      lastMatchStartTime: "",
      leaderboard: [],
    } as LocalLeague);
  }

  const leagueData = await db.get(leagueId);
//   console.log("getting league", leagueData);

  return leagueData;
}
