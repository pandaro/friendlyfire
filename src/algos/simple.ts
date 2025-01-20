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

export default async function Simple(
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
  const ratioPlayers = nTrackedPlayers / (teamSize * 2);

  // If match id is lower than last match id, return
  const league = await GetLeagueData(db.league, "league");
  if (match.id <= league.lastMatchId || winningTeam.length === 0 || loosingTeam.length === 0) {
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

  const totalPlayedMatches = Object.values(playerData.mode).reduce((a, b) => a + b, 0);
  
  let points = 0;
  if(totalPlayedMatches < 20) {
    points = 100;
  } else if(totalPlayedMatches < 50) {
    points = 75;
  } else {
    points = 50;
  }

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
  let encountersBonusMalusAverage = 0;
  for(const opposingPlayer of opposingTeam){
    encountersBonusMalusAverage = (GetPlayersEncounteredBonusMalus(playerData, opposingPlayer) + encountersBonusMalusAverage) / 2; 
  }

  // Bonus malus average
  const bonusMalus = Math.max(0.7, (mapBonusMalus + gameModeBonusMalus + encountersBonusMalusAverage) / 3);
  points = points * bonusMalus;

  // Win probability
  const winProb = 1 / (1 + Math.pow(10, (teamAverageRank - opposingTeamAverageRank) / 200));
  console.log("li cannuoli", points, winProb, teamAverageRank, opposingTeamAverageRank);

  if(winning) {
    playerData.points += (points * (1 - winProb)) * ratioPlayers;
    playerData.won += 1;
  } else {
    playerData.points -= (points * winProb) * ratioPlayers;
    playerData.lost += 1;
  }

  const playerName = _playersTrackedParsed[playerId];
  await SetPlayerData(db.players, playerData, playerId);
}

function GetMapBonusMalus(
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

  return 1 - ratioMap;
}

function GetGameModeBonusMalus(
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

  return 1 - ratioModes;
}

function GetPlayersEncounteredBonusMalus(playerData: LocalPlayer, opposingPlayer: string) {
  let ratioEncounters = 0
  let maxEncounter = 0

  const keys = Object.keys(playerData.encounters);
    keys.forEach((key) => {
      maxEncounter = Math.max(maxEncounter,playerData.encounters[key as keyof typeof playerData.encounters]);
    });

  ratioEncounters =  playerData.encounters[opposingPlayer] / maxEncounter;

  console.log("ratio patata", ratioEncounters);

  return 1 - ratioEncounters;
}

async function DebugLeaderboard(db: LocalDatabase) {
  const league = await GetLeagueData(db.league, "league");

  // Parse leaderboard data by adding user names
  const leaderboard = await Promise.all(
    league.leaderboard.map(async (l) => {
      const playerData = await GetPlayerData(db.players, l.userId);
      const matchesWon = playerData.won;
      const matchesLost = playerData.lost;
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
  const playerDataPromises = team.map(player => GetPlayerData(db.players, player));
  const playersData = await Promise.all(playerDataPromises);
  
  let sum = 0;
  for (const playerData of playersData) {
    sum += playerData.points;
  }

  console.log("la patata", sum, team.length);

  return sum / team.length;
}


