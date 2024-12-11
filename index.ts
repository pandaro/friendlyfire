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
import { LoadPlayersIds, LoadLeagueMatchIds, LoadMatches, LoadPlayersInMatch, LoadPlayers } from "./database/queries";
import { Database } from "duckdb-async";
import { GetLeagueData } from "./database/localQueries";

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
  // console.log("API used: " + config.api);

  // console.log(db);


  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 30);
  const PastDateFormated = pastDate.toISOString().split("T")[0];
  const TodayteFormated = today.toISOString().split("T")[0];
  const dateRange: QueryDateRange = {
    start: PastDateFormated,
    end: TodayteFormated,
  };
  
  let StartDate = new Date(config.StartTime);
  let EndTime = new Date(config.EndTime);//TO DO gestirlo in query
  console.log("StartDate: " + StartDate.toISOString());
  console.log("EndTime: " + EndTime.toISOString());
  //Check valid date
  if(isNaN(StartDate.getTime()) || isNaN(EndTime.getTime()))
  {
    return;
  }

  const players = await LoadPlayers(db, _playersTracked);
  console.log("tracked players", players);

  // Add player id to the tracked players
  _playersTrackedParsed = Object.keys(players).map((key) => {
    return { id: key, name: players[key].name };
  });

  // Get league data from db and set the last match id
  const league = await GetLeagueData(localDb.league, "league");
  const lastMatchId = league.lastMatchId ? league.lastMatchId : "0";

  const playersMatches = await LoadLeagueMatchIds(db, players, lastMatchId);
  console.log("playersMatches found", playersMatches.length);

   if(playersMatches.length > 0) {
    const matches = await LoadMatches(db, playersMatches.map((m) => m.matchId), StartDate);
  console.log("matches found", matches.length);

  console.log("Start parsing matches...");
  const parsedMatches = await ParseMatches(matches, players, playersMatches);
} else { 
  console.log("No matches found, nothing to update!");
}
  // console.log("parsed matches", parsedMatches);
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

