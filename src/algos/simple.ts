import {
  GetLeagueData,
  GetPlayerData,
  SetLeagueData,
  SetMatchData,
  SetPlayerData,
} from "../../database/localQueries";
import { LocalDatabase, LocalLeague, Match } from "../types";

export default async function SimpleAlgo(
  db: LocalDatabase,
  match: Match,
  debug = true
) {
  const winningTeam = match.winningTeam;
  const loosingTeam = match.loosingTeam;

  await SetMatchData(db.matches, match, match.id);

  // Process teams in parallel
  //   await Promise.all(
  //     winningTeam.map(async (player) => {
  //       if (await db.players.get(player)) {
  //         await AddWinningPlayerPoints(player, db);
  //       } else {
  //         console.log(`Player ${player} not found in database`);
  //         await AddPlayerToDatabase(db, player);
  //         await AddWinningPlayerPoints(player, db);
  //       }
  //     })
  //   );

  //   await Promise.all(
  //     loosingTeam.map(async (player) => {
  //       if (await db.players.get(player)) {
  //         await AddLoosingPlayerPoints(player, db);
  //       } else {
  //         console.log(`Player ${player} not found in database`);
  //         await AddPlayerToDatabase(db, player);
  //         await AddLoosingPlayerPoints(player, db);
  //       }
  //     })
  //   );

  // Process winningTeam sequentially
  for (const player of winningTeam) {
    if (await db.players.get(player)) {
      await AddWinningPlayerPoints(player, db);
    } else {
      console.log(`Player ${player} not found in database`);
      await AddPlayerToDatabase(db, player);
      await AddWinningPlayerPoints(player, db);
    }
  }

  // Process loosingTeam sequentially
  for (const player of loosingTeam) {
    if (await db.players.get(player)) {
      await AddLoosingPlayerPoints(player, db);
    } else {
      console.log(`Player ${player} not found in database`);
      await AddPlayerToDatabase(db, player);
      await AddLoosingPlayerPoints(player, db);
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

async function AddWinningPlayerPoints(playerId: string, db: LocalDatabase) {
  const playerData = await GetPlayerData(db.players, playerId);
  playerData.points += 2;
  await SetPlayerData(db.players, playerData, playerId);
}

async function AddLoosingPlayerPoints(playerId: string, db: LocalDatabase) {
  const playerData = await GetPlayerData(db.players, playerId);
  playerData.points += 1;
  await SetPlayerData(db.players, playerData, playerId);
}

async function AddPlayerToDatabase(db: LocalDatabase, playerId: string) {
  console.log(`Adding ${playerId} to database`);
  const _p = { points: 0, maps: {}, teamMates: {} };
  await SetPlayerData(db.players, _p, playerId);

  await AddPlayerToLeaderboard(playerId, db);
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
