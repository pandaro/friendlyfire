/* 
  Semi-Competitive Algorithm
  Version: 0.1
  Author: CanestroAnale
  Description: wip
*/
import { _playersTracked, _playersTrackedParsed } from "../..";
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
  const gameMode = match.gameMode;
  const nTrackedPlayers = winningTeam.length + loosingTeam.length;

  await SetMatchData(db.matches, match, match.id);

  // Process winningTeam sequentially
  for (const player of winningTeam) {
    if (await db.players.get(player)) {
      await AddWinningPlayerPoints(player, map, db);
      await AddGameModePlayerPoints(player, gameMode, db)
    } else {
      console.log(`Player ${player} not found in database`);
      await AddPlayerToDatabase(db, player);
      await AddWinningPlayerPoints(player, map, db);
      await AddGameModePlayerPoints(player, gameMode, db)
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
      await AddLoosingPlayerPoints(player, map, db);
      await AddGameModePlayerPoints(player, gameMode, db)

    } else {
      console.log(`Player ${player} not found in database`);
      await AddPlayerToDatabase(db, player);
      await AddLoosingPlayerPoints(player, map, db);
      await AddGameModePlayerPoints(player, gameMode, db)

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


async function AddGameModePlayerPoints(
  //bots,raptors,scavs,duel,smallteams,largeteams,duel,ffa,teamffa
  playerId: string,
  gameMode: string,
  db: LocalDatabase
) {
  const playerData = await GetPlayerData(db.players, playerId);
  const leagueData = await GetLeagueData(db.league, "league");

  if (!playerData.mode[gameMode]) playerData.mode[gameMode] = 0;
  playerData.mode[gameMode] += 1;
  console.log(`Player ${playerId} playMode:`, gameMode,playerData.mode[gameMode]);
  let totalMode = 0
  let ratioModes = 0
  let maxMode = 0
  const keys = Object.keys(playerData.mode);
  keys.forEach((key) => {
    maxMode = Math.max(maxMode,playerData.mode[key as keyof typeof playerData.mode]);
    totalMode = totalMode + playerData.mode[key as keyof typeof playerData.mode];
    //console.log('key',key,playerData.mode[key as keyof typeof playerData.mode]);

  });
  ratioModes =  playerData.mode[gameMode] / maxMode;
  let points = Math.min(Math.round(10 * (1-ratioModes)),10)
  console.log('maxMode',maxMode,'thisMode',playerData.mode[gameMode], 'ratioModes',playerData.mode[gameMode]/totalMode,'points',points,playerData.mode);



  playerData.points += points;

  await SetPlayerData(db.players, playerData, playerId);
}


async function AddWinningPlayerPoints(
  playerId: string,
  map: string,
  db: LocalDatabase
) {
  const playerData = await GetPlayerData(db.players, playerId);
  const leagueData = await GetLeagueData(db.league, "league");
  if (!playerData.wins[map]) playerData.wins[map] = 0;
  playerData.wins[map]++;

  let points = Math.min(20 - playerData.wins[map] / 2, 2);

  playerData.points += Math.round(points);

  await SetPlayerData(db.players, playerData, playerId);
}



async function AddLoosingPlayerPoints(
  playerId: string,
  map: string,
  db: LocalDatabase
) {
  const playerData = await GetPlayerData(db.players, playerId);
  if (!playerData.wins[map]) playerData.wins[map] = 0;
  if (!playerData.losses[map]) playerData.losses[map] = 0;
  playerData.losses[map]++;

  const points = playerData.wins[map] / 2;
  playerData.points -= Math.min(Math.round(points), 19);

  await SetPlayerData(db.players, playerData, playerId);
}

async function AddTrackedEncounterPoints(
  db: LocalDatabase,
  playerId: string,
  encounterPlayerId: string
) {
  const playerData = await GetPlayerData(db.players, playerId);
  const leagueData = await GetLeagueData(db.league, "league");

  if (!playerData.teamMates[encounterPlayerId])
    playerData.teamMates[encounterPlayerId] = 0;

  playerData.points += Math.min(
    20 - Math.round(playerData.teamMates[encounterPlayerId] / 2),
    2
  );

  // Deprecated idea to incentivize players to play with lower ranked players
  // const pPosition = leagueData.leaderboard.findIndex(
  //   (l) => l.userId === encounterPlayerId
  // );
  // playerData.points += (pPosition);

  playerData.points += 5;


  playerData.teamMates[encounterPlayerId]++;

  await SetPlayerData(db.players, playerData, playerId);
}

async function AddPlayerToDatabase(db: LocalDatabase, playerId: string) {
  console.log(`Adding ${playerId} to database`);
  const _p = { points: 0, maps: {}, teamMates: {}, wins: {}, losses: {}, mode:{} };
  await SetPlayerData(db.players, _p, playerId);

  await AddPlayerToLeaderboard(playerId, db);
}

async function DebugLeaderboard(db: LocalDatabase) {
  const league = await GetLeagueData(db.league, "league");

  // Parse leaderboard data by adding user names
  const leaderboard = await Promise.all(
    league.leaderboard.map(async (l) => {
      const playerData = await GetPlayerData(db.players, l.userId);
      const matchesWon = Object.values(playerData.wins).reduce((a, b) => a + b, 0);
      const matchesLost = Object.values(playerData.losses).reduce((a, b) => a + b, 0);
      const matchesPlayed = matchesWon + matchesLost;
      const playerName = _playersTrackedParsed.find((p) => p.id === l.userId)?.name;
      // return {userId: l.userId, points: l.points, name: playerName, matchesPlayed: matchesPlayed};
      return {p: l.points, name: playerName, matches: `${matchesPlayed}/${matchesWon}W/${matchesLost}L`};
    })
  );



  console.log("League updated! ", leaderboard);
}

async function AddPlayerToLeaderboard(playerId: string, db: LocalDatabase) {
  const league = await GetLeagueData(db.league, "league");
  league.leaderboard.push({ userId: playerId, points: 0 });

  await SetLeagueData(db.league, league, "league");
}
