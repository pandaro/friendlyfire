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
import initDatabase, { AddPlayerToDatabase, initLocalDatabase } from "./database/index";
import {
  LoadPlayersIds,
  LoadLeagueMatchIds,
  LoadMatches,
  LoadPlayersInMatch,
  LoadPlayers,
} from "./database/queries";
import { Database } from "duckdb-async";
import { GetLeagueData } from "./database/localQueries";
import {
  GetMatchData,
  GetPlayerMatchesIds,
} from "./database/replaysApiQueries";

const scriptParams = process.argv.slice(2);

if (scriptParams.length > 0) {
  if (scriptParams[0] === "debug") {
  }
}

export var _playersTracked = config.trackedPlayers;
export var _playersTrackedParsed: { [key: string]: string } = {};
let dumpDb: Database;
const localDb: LocalDatabase = initLocalDatabase();

initDatabase().then((_db) => {
  dumpDb = _db;

  Main();
});

async function Main() {

  // Build the date range
  let StartDate = new Date(config.StartTime);
  let EndTime = new Date(config.EndTime); //TO DO gestirlo in query
  console.log("StartDate: " + StartDate.toISOString());
  console.log("EndTime: " + EndTime.toISOString());
  //Check valid date
  if (isNaN(StartDate.getTime()) || isNaN(EndTime.getTime())) {
    return;
  }

  // Load players from the bar dump database
  const players = await LoadPlayers(dumpDb, _playersTracked);
  console.log("tracked players", players);

  for (const key of Object.keys(players)) {
    _playersTrackedParsed[key] = players[key].name as string;
    if (!await localDb.players.get(key)) {
      console.log(`Player ${key} not found in database`);
      await AddPlayerToDatabase(localDb, key);
    }
  }

  // Check if the data retrieval method is the api
  if (config.dataRetrievalMethod === "api") {
    console.log("API used: " + config.api);

    let arrayOfPlayerMatchesIds: string[][] = [];

    // Get tracked players names
    let _playersNamesT = Object.values(_playersTrackedParsed);
    console.log("tracked players names", _playersNamesT);

    // Format the date range for the query
    const dateRange: QueryDateRange = {
      start: StartDate.toISOString().split("T")[0],
      end: EndTime.toISOString().split("T")[0],
    };

    // If the local database has a last match date change the dateRange to start from the last match date
    const league = await GetLeagueData(localDb.league, "league");
    if (league.lastMatchStartTime) {
      const formattedLastMatchDate = new Date(league.lastMatchStartTime)
        .toISOString()
        .split("T")[0];
      dateRange.start = formattedLastMatchDate;
      console.log("dateRange updated with last match date", dateRange.start);
    }

    // Get matches ids for each player
    for (let i = 0; i < _playersNamesT.length; i++) {
      if (!_playersNamesT[i]) {
        console.log("player name not found");
        continue;
      }

      // Set a timeout to not overload the server
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

      let _playerMatchesIds = await GetPlayerMatchesIds(
        _playersNamesT[i] as string,
        dateRange
      );

      arrayOfPlayerMatchesIds.push(_playerMatchesIds);
    }

    let playersMatchesReplaysIds: { [key: MatchId]: string[] } = {};

    for (let i = 0; i < arrayOfPlayerMatchesIds.length; i++) {
      const _playerMatchesIds = arrayOfPlayerMatchesIds[i];
      for (let jj = 0; jj < _playerMatchesIds.length; jj++) {
        if (playersMatchesReplaysIds[_playerMatchesIds[jj]]) {
          playersMatchesReplaysIds[_playerMatchesIds[jj]].push(
            _playersNamesT[i] as string
          );
        } else {
          playersMatchesReplaysIds[_playerMatchesIds[jj]] = [
            _playersNamesT[i] as string,
          ];
        }
      }
    }

    console.log(
      "playersMatchesReplaysIds found",
      Object.keys(playersMatchesReplaysIds).length
    );
    let playersMatchesReplays = [];
    for (
      let i = Object.keys(playersMatchesReplaysIds).length - 1;
      i >= 0;
      i--
    ) {
      if (
        playersMatchesReplaysIds[Object.keys(playersMatchesReplaysIds)[i]]
          .length > 1
      ) {
        playersMatchesReplays.push(Object.keys(playersMatchesReplaysIds)[i]);
      }
    }
    console.log("playersMatches found", playersMatchesReplays.length);

    if (playersMatchesReplays.length > 0) {
      // reorder playersMatchesReplays in ascending order
      playersMatchesReplays = playersMatchesReplays.sort((a, b) => {
        return parseInt(a) - parseInt(b);
      });

      console.log("playersMatchesReplays", playersMatchesReplays);

      console.log("Start parsing matches...");
      let matchesArray = [];

      for (let i = 0; i < playersMatchesReplays.length; i++) {
        let match = await GetMatchData(playersMatchesReplays[i]);
        matchesArray.push(match);

        console.log("fetched match id " + match.id);
        console.log("- winning team", match.winningTeam);
        console.log("- losing team", match.loosingTeam);
      }

      // Reorder matches in ascending order by id
      matchesArray = matchesArray.sort((a, b) => {
        return parseInt(a.id) - parseInt(b.id);
      });

      for (let i = 0; i < matchesArray.length; i++) {
        console.log(
          `----------------------- ${i + 1}/${
            matchesArray.length
          } --------------------------`
        );
        console.log("parsed match id " + matchesArray[i].id);
        console.log("- winning team", matchesArray[i].winningTeam);
        console.log("- losing team", matchesArray[i].loosingTeam);
        console.log("- start time", matchesArray[i].startTime);
        console.log("- map", matchesArray[i].map);
        console.log("- game mode", matchesArray[i].gameMode);
        console.log(`-------------------------------------------------`);

        await config.usedAlgorithm(localDb, matchesArray[i]);
      }
    } else {
      console.log("No matches found, nothing to update!");
    }
  } else if (config.dataRetrievalMethod === "dumpDb") {
    // Get league data from db and set the last match id
    const league = await GetLeagueData(localDb.league, "league");
    const lastMatchId = league.lastMatchId ? league.lastMatchId : "0";

    const playersMatches = await LoadLeagueMatchIds(dumpDb, players, lastMatchId);
    console.log("playersMatches found", playersMatches.length);

    if (playersMatches.length > 0) {
      const matches = await LoadMatches(
        dumpDb,
        playersMatches.map((m) => m.matchId),
        StartDate
      );
      console.log("matches found", matches.length);

      console.log("Start parsing matches...");
      const parsedMatches = await ParseMatches(
        matches,
        players,
        playersMatches
      );
    } else {
      console.log("No matches found, nothing to update!");
    }
  } 
}

// Return an array of Match objects
async function ParseMatches(
  matches: DbMatch[],
  _trackedPlayers: PlayersMatches,
  playersMatches: PlayerMatch[]
): Promise<Match[]> {
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
      const matchPlayers: PlayerMatch[] = await LoadPlayersInMatch(
        dumpDb,
        m.match_id
      );
      
      let _teamSize = 0;
      matchPlayers.forEach((mp, i) => {
        const winningTeamID: string = m.winning_team as string;
        const playerTeamId: string = mp.teamId as string;

        if (_trackedPlayers[mp.userId]) {
          // Add player to the winning or losing team
          if (playerTeamId === winningTeamID) {
            _teamSize ++ ;

            _winningTeam[mp.userId] = {
              teamId: mp.teamId,
              name: _trackedPlayers[mp.userId]?.name,
            };
          } else {
            _loosingTeam[mp.userId] = {
              teamId: mp.teamId,
              name: _trackedPlayers[mp.userId]?.name,
            };
          }

          // Add players in the tracked players list present in the match to the match tracked players list

          trackedPlayers.push(mp.userId);
        }
        if (_trackedPlayers[mp.userId]) {
          matchPlayers[i].name = _trackedPlayers[mp.userId].name;
        }
      });
      console.log(
        `----------------------- ${index + 1}/${
          matches.length
        } --------------------------`
      );

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
        gameMode: m.game_type,
        teamSize: _teamSize,
      };

      await config.usedAlgorithm(localDb, match);
      console.log(
        `----------------------^ ${index + 1}/${
          matches.length
        } ^---------------------------`
      );

      return match;
    })
  );
}
