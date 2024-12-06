import config from "./config";
import {
  PlayersMatches,
  Match,
  MatchId,
  RankedPlayer,
  QueryDateRange,
  DbMatch,
  PlayerMatch,
  LocalDatabase,
} from "./src/types/index.js";
import initDatabase, { initLocalDatabase } from "./database/index";
import { LoadPlayersIds, LoadLeagueMatchIds, LoadMatches, LoadPlayersInMatch } from "./database/queries";
import { Database } from "duckdb-async";

const scriptParams = process.argv.slice(2);

if(scriptParams.length > 0) {
  if(scriptParams[0] === "debug") {
}
}

export var _playersTracked = config.trackedPlayers;
export var _playersTrackedParsed: {id?: string, name?: string}[] = [];
let db: Database;
const localDb: LocalDatabase = initLocalDatabase();

initDatabase().then((_db) => {
  db = _db;

  Main();
});

async function Main() {
  console.log("API used: " + config.api);

  console.log(db);


  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 30);
  const PastDateFormated = pastDate.toISOString().split("T")[0];
  const TodayteFormated = today.toISOString().split("T")[0];
  const dateRange: QueryDateRange = {
    start: PastDateFormated,
    end: TodayteFormated,
  };

  console.info("dal " + PastDateFormated + " | " + "al " + TodayteFormated);

  const players = await LoadPlayersIds(db, _playersTracked);
  console.log("tracked players", players);

  // Add player id to the tracked players
  _playersTrackedParsed = _playersTracked.map((player) => {
    const id = Object.keys(players).find((key) => players[key].name === player);
    return {id: id, name: player };
  });

  const playersMatches = await LoadLeagueMatchIds(db, players);
  console.log("playersMatches found", playersMatches.length);

  const matches = await LoadMatches(db, playersMatches.map((m) => m.matchId), "2024-10-15T00:24:15.000Z");
  console.log("matches found", matches.length);

  console.log("Start parsing matches...");
  const parsedMatches = await ParseMatches(matches, players, playersMatches);
  console.log("parsed matches", parsedMatches);
}

// Parse matches with the following structure:
// {
//   match_id: string;
//   start_time: string;
//   winning_team: string[]; // player ids
//   losing_team: string[]; // player ids
//   map: string;
// }
//
// Return an array of Match objects
async function ParseMatches(matches: DbMatch[],_trackedPlayers: PlayersMatches, playersMatches: PlayerMatch[]): Promise<Match[]> {
  return await Promise.all(
    matches.map(async (m, index) => {
      const _winningTeam: PlayersMatches = {};
      const _loosingTeam: PlayersMatches = {};
  
      
      // const matchPlayers: PlayerMatch[] = playersMatches.filter((pm) => {
      //   console.log("hey", pm.matchId, m.match_id);
      //   return pm.matchId === m.match_id;
      // });
      // console.log(matchPlayers);
      
      const trackedPlayers: string[] = [];
      const matchPlayers: PlayerMatch[] = await LoadPlayersInMatch(db, m.match_id);
      
      matchPlayers.forEach((mp, i) => {
        const winningTeamID: string = m.winning_team as string;
        const playerTeamId: string = mp.teamId as string;
        
        if(_trackedPlayers[mp.userId]) {
        // Add player to the winning or losing team
        if (playerTeamId === winningTeamID) {
          _winningTeam[mp.userId] = {  teamId: mp.teamId, name: _trackedPlayers[mp.userId]?.name };
        } else {
          _loosingTeam[mp.userId] = {  teamId: mp.teamId, name: _trackedPlayers[mp.userId]?.name };
        }

        // Add players in the tracked players list present in the match to the match tracked players list

          trackedPlayers.push(mp.userId);
        }
        if(_trackedPlayers[mp.userId]) {

          matchPlayers[i].name = _trackedPlayers[mp.userId].name;
        }
      });
      console.log(`----------------------- ${index+1}/${matches.length} --------------------------`);

      console.log("parsed match id " + m.match_id);
      // console.log("players in match", matchPlayers);
      // console.log("- tracked players", trackedPlayers);
      console.log("- winning team", _winningTeam);
      console.log("- losing team", _loosingTeam);
      // console.log("- start time", m.start_time);
      // console.log("- map", m.map);
      // console.log("- game mode", m.game_type);
      console.log(`-------------------------------------------------`);
  
      const match: Match = {
        id: m.match_id as MatchId,
        loosingTeam: Object.keys(_loosingTeam),
        winningTeam: Object.keys(_winningTeam),
        startTime: m.start_time,
        map: m.map,
        gameMode: m.game_type
      };

      await config.usedAlgorithm(localDb, match);
      console.log(`----------------------^ ${index+1}/${matches.length} ^---------------------------`)


      return match;
  
    })
  )
}

