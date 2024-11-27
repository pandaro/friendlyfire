/* 
  Semi-Competitive Algorithm
  Version: 0.1
  Author: CanestroAnale
  Description: wip
*/
import {
  GetLeagueData,
  GetPlayerData,
  SetLeagueData,
  SetMatchData,
  SetPlayerData,
} from "../../database/localQueries";
import { LocalDatabase, LocalLeague, Match } from "../types";

export default async function SemiCompetitiveAlgo(
  db: LocalDatabase,
  match: Match,
  debug = true
) {
  const winningTeam = match.winningTeam;
  const loosingTeam = match.loosingTeam;
  const map = match.map;
  const nTrackedPlayers = winningTeam.length + loosingTeam.length;

  await SetMatchData(db.matches, match, match.id);

  // Process winningTeam sequentially
  for (const player of winningTeam) {
    if (await db.players.get(player)) {
      await AddWinningPlayerPoints(player, map, nTrackedPlayers, db);
    } else {
      console.log(`Player ${player} not found in database`);
      await AddPlayerToDatabase(db, player);
      await AddWinningPlayerPoints(player, map, nTrackedPlayers, db);
    }

    // Add points from tracked players encounters in winning team
    for (const encounterPlayer of winningTeam) {
      if (encounterPlayer !== player) {
        await AddTrackedEncounterPoints(db, player, encounterPlayer);
      }
    }
    // Add points from tracked players encounters in loosing team
    for (const encounterPlayer of loosingTeam) {
      await AddTrackedEncounterPoints(db, player, encounterPlayer);
    }
  }

  // Process loosingTeam sequentially
  for (const player of loosingTeam) {
    if (await db.players.get(player)) {
      await AddLoosingPlayerPoints(player, map, nTrackedPlayers, db);
    } else {
      console.log(`Player ${player} not found in database`);
      await AddPlayerToDatabase(db, player);
      await AddLoosingPlayerPoints(player, map, nTrackedPlayers, db);
    }

    // Add points from tracked players encounters in loosing team
    for (const encounterPlayer of loosingTeam) {
      if (encounterPlayer !== player) {
        await AddTrackedEncounterPoints(db, player, encounterPlayer);
      }
    }
    // Add points from tracked players encounters in loosing team
    for (const encounterPlayer of winningTeam) {
      await AddTrackedEncounterPoints(db, player, encounterPlayer);
    }
  }

  await UpdateLeague(match.id, match.startTime, db);

  if (debug) await DebugLeaderboard(db);
}

async function UpdateLeague(
  matchId: string,
  matchStartTime: string,
  db: LocalDatabase
) {
  let league: LocalLeague = await GetLeagueData(db.league, "league");
  //   league = JSON.parse(league.toString());
  league.lastMatchId = matchId;
  league.lastMatchStartTime = matchStartTime;
  const leaderboard: { userId: string; points: number }[] = league.leaderboard;

  for (let i = 0; i < leaderboard.length; i++) {
    const pd = await GetPlayerData(db.players, leaderboard[i].userId);
    leaderboard[i].points = pd.points;
  }

  leaderboard.sort((a, b) => {
    return b.points - a.points;
  });

  await SetLeagueData(db.league, league, "league");
}

async function AddWinningPlayerPoints(
  playerId: string,
  map: string,
  nTrackedPlayers: number,
  db: LocalDatabase
) {
  const playerData = await GetPlayerData(db.players, playerId);
  if (!playerData.maps[map]) playerData.maps[map] = 0;
  playerData.maps[map]++;

  let points = Math.min(20 - playerData.maps[map] / 2, 2);

  // Give 10 points for each encountered tracked player
  points += (nTrackedPlayers - 1) * 10;

  playerData.points += Math.round(points);

  await SetPlayerData(db.players, playerData, playerId);
}

async function AddLoosingPlayerPoints(
  playerId: string,
  map: string,
  nTrackedPlayers: number,
  db: LocalDatabase
) {
  const playerData = await GetPlayerData(db.players, playerId);
  if (!playerData.maps[map]) playerData.maps[map] = 0;

  const points = playerData.maps[map];
  playerData.points -= Math.round(points);

  // Give 10 points for each encountered tracked player
  playerData.points += (nTrackedPlayers - 1) * 10;

  await SetPlayerData(db.players, playerData, playerId);
}

async function AddPlayerToDatabase(db: LocalDatabase, playerId: string) {
  console.log(`Adding ${playerId} to database`);
  const _p = { points: 0, maps: {}, teamMates: {} };
  await SetPlayerData(db.players, _p, playerId);

  await AddPlayerToLeaderboard(playerId, db);
}

async function AddTrackedEncounterPoints(
  db: LocalDatabase,
  playerId: string,
  encounterPlayerId: string
) {
  const playerData = await GetPlayerData(db.players, playerId);

  if (!playerData.teamMates[encounterPlayerId])
    playerData.teamMates[encounterPlayerId] = 0;

  playerData.points += Math.min(
    10 - Math.min(playerData.teamMates[encounterPlayerId] / 2, 0),
    2
  );

  playerData.teamMates[encounterPlayerId]++;

  await SetPlayerData(db.players, playerData, playerId);
}

async function DebugLeaderboard(db: LocalDatabase) {
  const leaderboard = await GetLeagueData(db.league, "league");
  console.log("League updated! ", leaderboard);
}

async function AddPlayerToLeaderboard(playerId: string, db: LocalDatabase) {
  const league = await GetLeagueData(db.league, "league");
  league.leaderboard.push({ userId: playerId, points: 0 });

  await SetLeagueData(db.league, league, "league");
}
