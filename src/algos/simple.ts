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
  const ratioPlayers = nTrackedPlayers / match.playersCount;

  // If match id is lower than last match id, return
  const league = await GetLeagueData(db.league, "league");
  if (
    match.id <= league.lastMatchId
  ) {
    console.log(`Match ${match.id} already processed, skipping...`);
    return;
  }
  if(
    winningTeam.length === 0 ||
    loosingTeam.length === 0) {
      console.log(`Match ${match.id} has no opposing team, skipping...`);
      return;
    }
  await SetMatchData(db.matches, match, match.id);

  const winningTeamAverageRank = await GetAverageTeamRank(winningTeam, db);
  const loosingTeamAverageRank = await GetAverageTeamRank(loosingTeam, db);

  // Parse winning and loosing team for debuging purposes
  const winningTeamParsed = winningTeam.map((player) => {
    return _playersTrackedParsed[player];
  });
  const loosingTeamParsed = loosingTeam.map((player) => {
    return _playersTrackedParsed[player];
  });
  console.log(`- winning team (avg rank ${Math.round(winningTeamAverageRank)})`, winningTeamParsed);
  console.log(`- losing team (avg rank ${Math.round(loosingTeamAverageRank)})`, loosingTeamParsed);
  console.log(
    "map:",
    map,
    ", mode:",
    gameMode,
    ", %friendlyfire:",
    ratioPlayers,
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
      teamSize
    );
  } //punti per chi vince
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
      teamSize
    );
  } //punti di chi perde

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
    leaderboard[i].points = pd.points - Math.max(0, 300 - ((pd.won + pd.lost) * 10));
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
  teamSize: number
) {
  // Get player data and league data from database
  const playerData = await GetPlayerData(db.players, playerId);

  const startingPoints = playerData.points;

  const totalPlayedMatches = playerData.won + playerData.lost;
  const scale = 1400;
  let points = 0;
  if (totalPlayedMatches < 20) {
    points = 80;
  } else if (totalPlayedMatches < 50) {
    points = 65;
  } else {
    points = 50;
  }

  // Map related
  if (!playerData.maps[map]) playerData.maps[map] = 0;
  playerData.maps[map] += 1;
  const mapBonusMalus = GetMapBonusMalus(playerData, map);

  // Game mode related
  if (!playerData.mode[gameMode]) playerData.mode[gameMode] = 0;
  playerData.mode[gameMode] += 1;
  const gameModeBonusMalus = GetGameModeBonusMalus(playerData, gameMode);

  // Players encountered related
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

  // Bonus malus average
  const bonusMalus = Math.max(
    1,
    (mapBonusMalus + gameModeBonusMalus + encountersBonusMalusAverage) / 3
  );
  let basePoints = points;
  points = points * bonusMalus;

  console.log(
    `${playerData.name} base points:`,
    basePoints,
    ", encounters:",
    encountersBonusMalusAverage.toFixed(2),
    ", map:",
    mapBonusMalus,
    ", mode:",
    gameModeBonusMalus,
    "bonusMalus:",
    bonusMalus,
    ", POINTS:",
    points
  );
  // Win probability
  const winProb =
    1 / (1 + Math.pow(10, ( opposingTeamAverageRank - teamAverageRank) / (scale * (1- ratioPlayers) * (teamSize / 8))));

  if (winning) {
    playerData.points += points * (1 - winProb) * ratioPlayers;
    playerData.won += 1;
    console.log(
      "[WON] player:",
      playerData.name,
      ", scale:",
      (scale * (1- ratioPlayers) * (teamSize / 8)).toFixed(2),
      ", %win:",
      winProb.toFixed(2),
      ", oldPoints:",
      points,
      ", scaledPoints:",
      (points * (1 - winProb)).toFixed(2),
      ", adjust per ratio of players:",
      (points * (1 - winProb) * ratioPlayers).toFixed(2),
      `, ${startingPoints.toFixed(2)} ---> ${playerData.points.toFixed(2)}`,
    );
  } else {
    playerData.points -= points * winProb * ratioPlayers;
    playerData.lost += 1;
    console.log(
      "[LOST] player:",
      playerData.name,
      ", scale:",
      (scale * (1- ratioPlayers) * (teamSize / 8)).toFixed(2),
      ", %win:",
      winProb.toFixed(2),
      ", oldPoints:",
      points,
      ", scaledPoints:",
      (points * winProb).toFixed(2),
      ", adjust per ratio of players:",
      (points * winProb * ratioPlayers).toFixed(2),
      `, ${startingPoints.toFixed(2)} ---> ${playerData.points.toFixed(2)}`,
    );
  }

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

  return 1 - ratioMap;
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
      return {
        P: l.points,
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
