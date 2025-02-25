/* 
  template algo + hypostesis
  Version: 0.1
  Author: CanestroAnale
  Description: wip
*/
import  config from "../../config";
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
  debug = false
) {
  const winningTeam = match.winningTeam;
  const loosingTeam = match.loosingTeam;
  const map = match.map;
  const gameMode = match.gameMode;
  const teamSize = match.teamSize;
  const nTrackedPlayers = winningTeam.length + loosingTeam.length;
  const ratioPlayers = nTrackedPlayers / match.playersCount;

  const league = await GetLeagueData(db.league, "league");
  if (match.id <= league.lastMatchId) {
    return;
  }
  if (winningTeam.length === 0 || loosingTeam.length === 0) {
    return;
  }
  await SetMatchData(db.matches, match, match.id);

  const winningTeamAverageRank = await GetAverageTeamRank(winningTeam, db);
  const loosingTeamAverageRank = await GetAverageTeamRank(loosingTeam, db);

  const debugTargetPlayer = process.env.DEBUG_PLAYER ?? "";
  const winningTeamParsed = winningTeam.map((player) => {
    if (_playersTrackedParsed[player] === debugTargetPlayer) {
      debug = true;
    }
    return _playersTrackedParsed[player];
  });
  const loosingTeamParsed = loosingTeam.map((player) => {
    if (_playersTrackedParsed[player] === debugTargetPlayer) {
      debug = true;
    }
    return _playersTrackedParsed[player];
  });

  DebugLog(
    debug,
    "map:",
    map,
    ", mode:",
    gameMode,
    ", %friendlyfire:",
    ratioPlayers.toFixed(2),
    " ,win:", winningTeamParsed, " ,rank:", Math.round(winningTeamAverageRank),
    " ,lose", loosingTeamParsed, " ,rank:", Math.round(loosingTeamAverageRank),
  );

  for (const player of winningTeam) {
    await ProcessPlayerPoints(
      true,
      player,
      loosingTeam,
      db,
      map,
      gameMode,
      ratioPlayers,
      winningTeamAverageRank,
      loosingTeamAverageRank,
      match.playersCount,
      debug,
    );
  }
  for (const player of loosingTeam) {
    await ProcessPlayerPoints(
      false,
      player,
      winningTeam,
      db,
      map,
      gameMode,
      ratioPlayers,
      loosingTeamAverageRank,
      winningTeamAverageRank,
      match.playersCount,
      debug,
    );
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


  league.lastMatchId = matchId;
  league.lastMatchStartTime = matchStartTime;
  const leaderboard: { userId: string; points: number;}[] = league.leaderboard;

  for (let i = 0; i < leaderboard.length; i++) {
    const pd = await GetPlayerData(db.players, leaderboard[i].userId);
    leaderboard[i].points = pd.points - Math.max(0, pd.unclaimedPoints);
    if (leaderboard[i].points < 0) {
      leaderboard[i].points = 0;
    }
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
  opposingTeamAverageRank: number,
  playersCount: number,
  debug: boolean,
) {
  const playerData = await GetPlayerData(db.players, playerId);
  const teamsAverageDeltaRank = teamAverageRank - opposingTeamAverageRank;
  const startingPoints = playerData.points;

  const totalPlayedMatches = playerData.won + playerData.lost;
  const scale = 1200;
  let points = 0;
  if (totalPlayedMatches < 10) {
    points += 100;
  } else {
    points += 50;
  }

  if (!playerData.maps[map]) playerData.maps[map] = 0;
  playerData.maps[map] += 1;
  const mapBonusMalus = GetMapBonusMalus(playerData, map);

  if (!playerData.mode[gameMode]) playerData.mode[gameMode] = 0;
  playerData.mode[gameMode] += 1;
  const gameModeBonusMalus = GetGameModeBonusMalus(playerData, gameMode);

  for (const encounterPlayer of opposingTeam) {
    if (!playerData.encounters[encounterPlayer])
      playerData.encounters[encounterPlayer] = 0;
    playerData.encounters[encounterPlayer]++;
  }
  let encountersBonusMalusAverage = 0;
  let encounterCounter = 0;
  for (const opposingPlayer of opposingTeam) {
    encountersBonusMalusAverage += GetPlayersEncounteredBonusMalus(
      playerData,
      opposingPlayer
    );
    encounterCounter += 1;
  }
  encountersBonusMalusAverage = encountersBonusMalusAverage / encounterCounter;

  const bonusMalus = Math.max(
    0.5,
    (mapBonusMalus + encountersBonusMalusAverage)
  );
  let basePoints = points;
  points = points * bonusMalus;
  let scaleAdjust = 200 + (scale * (playersCount / 16));
  const winProb = Math.min(1 / (1 + Math.pow(10, (opposingTeamAverageRank - teamAverageRank) / scaleAdjust)), 1400);

  DebugLog(
    debug,
    `${playerData.name} base points:`,
    basePoints.toFixed(2),
    ", encounters:",
    encountersBonusMalusAverage.toFixed(2),
    ", map:",
    mapBonusMalus.toFixed(2),
    ", mode:",
    gameModeBonusMalus.toFixed(2),
    "bonusMalus:",
    bonusMalus.toFixed(2),
    ", POINTS:",
    points.toFixed(2),
    " ,scaleAdjust:",
    scaleAdjust.toFixed(2),
    " ,winProb:",
    winProb.toFixed(2),
  );

  if (winning) {
    let pointsAssigned = (points * (1 - winProb) * ratioPlayers) * 1.1;
    playerData.points += pointsAssigned;
    playerData.won += 1;
    DebugLog(
      debug,
      "[WON] player:",
      playerData.name,
      ", scaledPoints:",
      (points * (1 - winProb)).toFixed(2),
      ", per ratio of players:",
      pointsAssigned.toFixed(2),
      `, ${startingPoints.toFixed(2)} ---> ${playerData.points.toFixed(2)}`,
    );
  } else {
    let pointsAssigned = (points * winProb * ratioPlayers);
    pointsAssigned = Math.min(playerData.points, pointsAssigned);
    playerData.points -= pointsAssigned;
    playerData.lost += 1;
    DebugLog(
      debug,
      "[LOST] player:",
      playerData.name,
      ", scaledPoints:",
      (points * winProb).toFixed(2),
      ", per ratio of players:",
      pointsAssigned.toFixed(2),
      `, ${startingPoints.toFixed(2)} ---> ${playerData.points.toFixed(2)}`,
    );
  }
  playerData.unclaimedPoints -= 10 * ratioPlayers;

  await SetPlayerData(db.players, playerData, playerId);
}

function GetMapBonusMalus(playerData: LocalPlayer, map: string) {
  let ratioMap = 0;
  let maxMap = 0;
  const keys = Object.keys(playerData.maps);
  keys.forEach((key) => {
    maxMap = Math.max(
      maxMap,
      playerData.maps[key as keyof typeof playerData.maps]
    );
  });
  ratioMap = playerData.maps[map] / maxMap;

  return (1 - ratioMap) / 2;
}

function GetGameModeBonusMalus(
  //bots,raptors,scavs,duel,smallteams,largeteams,duel,ffa,teamffa
  playerData: LocalPlayer,
  gameMode: string
) {
  let ratioModes = 0;
  let maxMode = 0;

  const keys = Object.keys(playerData.mode);
  keys.forEach((key) => {
    maxMode = Math.max(
      maxMode,
      playerData.mode[key as keyof typeof playerData.mode]
    );
  });
  ratioModes = playerData.mode[gameMode] / maxMode;

  return 1 - ratioModes;
}

function GetPlayersEncounteredBonusMalus(
  playerData: LocalPlayer,
  opposingPlayer: string
) {
  let ratioEncounters = 0;
  let maxEncounter = 0;

  const keys = Object.keys(playerData.encounters);
  keys.forEach((key) => {
    maxEncounter = Math.max(
      maxEncounter,
      playerData.encounters[key as keyof typeof playerData.encounters]
    );
  });

  ratioEncounters = playerData.encounters[opposingPlayer] / maxEncounter;

  return (1 - ratioEncounters) / 2;
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

      // Dont show players with 0 matches played
      if (matchesPlayed === 0) return

      return {
        P: l.points.toFixed(2),
        Name: playerName,
        matches_win: `${matchesWon}/${matchesPlayed}`,
      };
    })
  );

  console.log("League updated! ", leaderboard);
}

async function GetAverageTeamRank(team: string[], db: LocalDatabase) {
  const playerDataPromises = team.map((player) =>
    GetPlayerData(db.players, player)
  );
  const playersData = await Promise.all(playerDataPromises);

  let sum = 0;
  for (const playerData of playersData) {
    sum += playerData.points;
  }

  return sum / team.length;
}

function DebugLog(debug: boolean, ...args: any[]) {
  if (debug) {
    console.log(...args);
  }
}
