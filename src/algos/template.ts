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
  const teamSize = match.teamSize;
  const nTrackedPlayers = winningTeam.length + loosingTeam.length;
  const ratioPlayers = nTrackedPlayers / teamSize;

  // If match id is lower than last match id, return
  const league = await GetLeagueData(db.league, "league");
  if (match.id <= league.lastMatchId) {
    console.log(`Match ${match.id} already processed, skipping...`);
    return;
  }
  await SetMatchData(db.matches, match, match.id);

  const winningTeamAverageRank = await GetAverageTeamRank(winningTeam, db);
  const loosingTeamAverageRank = await GetAverageTeamRank(loosingTeam, db);


  for (const player of winningTeam) {
    ProcessPlayerPoints(true, player, loosingTeam, db,map,gameMode,ratioPlayers, winningTeamAverageRank, loosingTeamAverageRank);
  };//punti per chi vince
  for (const player of loosingTeam) {
    ProcessPlayerPoints(false, player, winningTeam, db,map,gameMode,ratioPlayers, loosingTeamAverageRank, winningTeamAverageRank);
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


async function ProcessPlayerPoints(
  winning: boolean,
  playerId: string,
  opposingTeam: string[],
  db: LocalDatabase,
  map: string,
  gameMode: string,
  ratioPlayers: number,
  teamAverageRank: number,
  opposingTeamAverageRank: number
) {
  // Get player data and league data from database
  const playerData = await GetPlayerData(db.players, playerId);
  const leagueData = await GetLeagueData(db.league, "league");


  // Map related
  if (!playerData.maps[map]) playerData.maps[map] = 0;
  playerData.maps[map] += 1;
  const mapBonusMalus = GetMapBonusMalus(playerData,map);

  // Game mode related
  if (!playerData.mode[gameMode]) playerData.mode[gameMode] = 0;
  playerData.mode[gameMode] += 1;
  const gameModeBonusMalus = GetGameModeBonusMalus(playerData,gameMode);

  // Players encountered related
  for(const encounterPlayer of opposingTeam){
    if(!playerData.encounters[encounterPlayer]) playerData.encounters[encounterPlayer] = 0; 
    playerData.encounters[encounterPlayer] ++;
  }
  const encountersBonusMalus = GetPlayersEncounteredBonusMalus(playerData, opposingTeam)//forse discorso a parte

  let points = winning ? 2 : -1;
  playerData.points += points;
  const playerName = _playersTrackedParsed[playerId];
  await SetPlayerData(db.players, playerData, playerId);
}

async function GetMapBonusMalus(
  playerData: LocalPlayer,
  map: string,
) {
  let ratioMap = 0
  let maxMap = 0
  const keys = Object.keys(playerData.maps);
  keys.forEach((key) => {
    maxMap = Math.max(maxMap,playerData.maps[key as keyof typeof playerData.maps]);
  });
  ratioMap =  playerData.maps[map] / maxMap;

  return ratioMap;
}

async function GetGameModeBonusMalus(
  //bots,raptors,scavs,duel,smallteams,largeteams,duel,ffa,teamffa
  playerData: LocalPlayer,
  gameMode: string,
) {
  let ratioModes = 0
  let maxMode = 0

  const keys = Object.keys(playerData.mode);
  keys.forEach((key) => {
    maxMode = Math.max(maxMode,playerData.mode[key as keyof typeof playerData.mode]);
  });
  ratioModes =  playerData.mode[gameMode] / maxMode;

  return ratioModes;
}

function GetPlayersEncounteredBonusMalus(playerData: LocalPlayer, opposingTeam: string[]) {
  let encSum = 0
  for(const encounterPlayer of opposingTeam){
    encSum += playerData.encounters[encounterPlayer];
  }
  const encAvg = encSum / opposingTeam.length; 

  let ratioEncounters = 0
  let maxEncounter = 0

  const keys = Object.keys(playerData.encounters);
  keys.forEach((key) => {
    maxEncounter = Math.max(maxEncounter,playerData.mode[key as keyof typeof playerData.mode]);
  });
  ratioEncounters =  encAvg / maxEncounter;

  return ratioEncounters;
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

async function GetAverageTeamRank(team: string[], db: LocalDatabase) {
  let sum = 0;
  for (const player of team) {
    const playerData = await GetPlayerData(db.players, player);
    sum += playerData.points;
  }
  return sum / team.length;
}


