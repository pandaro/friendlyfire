/* 
  template algo + hypostesis
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
import { LocalDatabase, LocalLeague, LocalPlayer, Match } from "../types";

export default async function template(
  db: LocalDatabase,
  match: Match,
  debug = true
) {
  const winningTeam = match.winningTeam;
  const loosingTeam = match.loosingTeam;
  const map = match.map;
  const gameMode = match.gameMode;
  const teamSize = match.teamSize;//TODO:WARNING:dati dalla partita aggiungere un counter per teamsize numero totale di players
  const nTrackedPlayers = winningTeam.length + loosingTeam.length;
  const ratioPlayers = nTrackedPlayers / teamSize;

  // If match id is lower than last match id, return
  const league = await GetLeagueData(db.league, "league");
  if (match.id <= league.lastMatchId) {
    console.log(`Match ${match.id} already processed, skipping...`);
    return;
  }
  await SetMatchData(db.matches, match, match.id);

  for (const player of winningTeam) {
    AddWinningPlayerPoints(player,db,map,gameMode,ratioPlayers);
  };//punti per chi vince
  for (const player of loosingTeam) {
    AddLoosingPlayerPoints(player,db,map,gameMode,ratioPlayers);

  };//punti di chi perde

  await UpdateLeague(match.id, match.startTime, db);
  if (debug) await DebugLeaderboard(db);
}

export default async function biotest(
  db: LocalDatabase,
  match: Match,
  debug = true
) {
  const winningTeam = match.winningTeam;
  const loosingTeam = match.loosingTeam;
  const map = match.map;
  const gameMode = match.gameMode;
  const teamSize = match.teamSize;//TODO:WARNING:dati dalla partita aggiungere un counter per teamsize numero totale di players
  const nTrackedPlayers = winningTeam.length + loosingTeam.length;
  const ratioPlayers = nTrackedPlayers / teamSize;

  // If match id is lower than last match id, return
  const league = await GetLeagueData(db.league, "league");
  if (match.id <= league.lastMatchId) {
    console.log(`Match ${match.id} already processed, skipping...`);
    return;
  }
  await SetMatchData(db.matches, match, match.id);
  for (const player of winningTeam) {
    AddWinningPlayerPoints(player,db);

  };//punti per chi vince
  for (const player of loosingTeam) {
    AddLoosingPlayerPoints(player,db);
    //perdi punti in base a quante partite fai
  };//punti di chi perde

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


async function GetGameModeBonusMalus(
  //bots,raptors,scavs,duel,smallteams,largeteams,duel,ffa,teamffa
  playerId: string,
  gameMode: string,
  db: LocalDatabase
) {
  const playerData = await GetPlayerData(db.players, playerId);
  const leagueData = await GetLeagueData(db.league, "league");
  if (!playerData.mode[gameMode]) playerData.mode[gameMode] = 0;
  playerData.mode[gameMode] += 1;
  let ratioModes = 0
  let maxMode = 0
  const keys = Object.keys(playerData.mode);
  keys.forEach((key) => {
    maxMode = Math.max(maxMode,playerData.mode[key as keyof typeof playerData.mode]);
  });
  ratioModes =  playerData.mode[gameMode] / maxMode;
  // let points = Math.min(Math.round(10 * (1-ratioModes)),10);
  let points = 0;
  playerData.points += points;
  const playerName = _playersTrackedParsed[playerId];
  console.log("Game mode ->" + playerName + "bonus/malus" + ratioModes + " gets " + points);
  await SetPlayerData(db.players, playerData, playerId);
}

async function GetMapBonusMalus(
  playerData: LocalPlayer,
  leagueData: LocalLeague,
  map: string,
  db: LocalDatabase
) {

  if (!playerData.maps[map]) playerData.maps[map][1]0;
  playerData.maps[map] += 1;
  let ratioMap = 0
  let maxMap = 0
  const keys = Object.keys(playerData.maps);
  keys.forEach((key) => {
    maxMap = Math.max(maxMap,playerData.maps[key as keyof typeof playerData.maps]);
  });
  ratioModes =  playerData.maps[map] / maxMap;
  //let points = 0;
  return ratioModes
//   const playerName = _playersTrackedParsed[playerId];
//
//   console.log("played map bonus ->" + playerName + "bonus/malus" + ratioMap + " gets " + points);
//   await SetPlayerData(db.players, playerData, playerId);
}


async function AddWinningPlayerPoints(
  playerId: string,
  db: LocalDatabase,
  map: string,
  gameMode: string,
  ratioPlayers: number,

) {
  const playerData = await GetPlayerData(db.players, playerId);
  const leagueData = await GetLeagueData(db.league, "league");
  const mapBonusMalus = GetMapBonusMalus(playerData,leagueData,map,db)
  const gameModeBonusMalus = GetGameModeBonusMalus(playerData,leagueData,gameMode,db)
  const playersEncountered = GetPlayersEncounteredBonusMalus(playerData,leagueData,playersEncountered,db)//forse discorso a parte
  const media

  let points = 1;
  playerData.points += points;
  const playerName = _playersTrackedParsed[playerId];
  console.log("winning ->" + playerName + " gets " + points);
  await SetPlayerData(db.players, playerData, playerId);
}


async function AddLoosingPlayerPoints(//WARNING:discutibile
  playerId: string,
  db: LocalDatabase
) {
  const playerData = await GetPlayerData(db.players, playerId);
  let points = -1;
  playerData.points += points;
  const playerName = _playersTrackedParsed[playerId];
  console.log("loosing ->" + playerName + " looses " + Math.round(points));
  await SetPlayerData(db.players, playerData, playerId);
}

async function AddTrackedEncounterPoints(


  db: LocalDatabase,
  playerId: string,
  encounterPlayerId: string,
  victory: boolean
) {
  const playerData = await GetPlayerData(db.players, playerId);
  const leagueData = await GetLeagueData(db.league, "league");

  if (!playerData.teamMates[encounterPlayerId])
  playerData.teamMates[encounterPlayerId] = 0;
  playerData.teamMates[encounterPlayerId]++;
  //TODO:come per gamemode e mappe


  playerData.points += 0;


  const playerName = _playersTrackedParsed[playerId];
  console.log("players ->" + playerName + " gets " + 5 + " + " + Math.round(points));




  await SetPlayerData(db.players, playerData, playerId);
}
//TODO: async function mucche e premi cassato per gennaio 2025


async function AddPlayerToDatabase(db: LocalDatabase, playerId: string) {
  console.log(`Adding ${playerId} - ${_playersTrackedParsed[playerId]} to database`);
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
      const playerName = _playersTrackedParsed[l.userId];
      // return {userId: l.userId, points: l.points, name: playerName, matchesPlayed: matchesPlayed};
      // return {p: l.points, name: playerName, matches: `${matchesPlayed}/${matchesWon}W/${matchesLost}L`};
      return {P: l.points, Name: playerName, matches_win: `${matchesWon}/${matchesPlayed}`};
    })
  );



  console.log("League updated! ", leaderboard);

}

async function AddPlayerToLeaderboard(playerId: string, db: LocalDatabase) {
  const league = await GetLeagueData(db.league, "league");
  league.leaderboard.push({ userId: playerId, points: 0 });

  await SetLeagueData(db.league, league, "league");
}
