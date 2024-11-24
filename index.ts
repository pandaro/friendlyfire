import { config } from "./config.js";
import axios from "axios";
import {
  TeamMember,
  Match,
  MatchId,
  RankedPlayer,
  QueryDateRange,
} from "./src/types/index.js";
import initDatabase from "./database/index.js";

const _ItCountryCode = "IT";
const _playersTracked = config.trackedPlayers;

function Main() {
  console.log("API used: " + config.api);

  const db = initDatabase();
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

  GetLeaderboard(_playersTracked, dateRange).then((res) => {
    let leaderboard: RankedPlayer[] = res;

    // Order the leaderboard by rank
    leaderboard.sort((a, b) => b.rank - a.rank);

    // Print the leaderboard
    console.log("Leaderboard:");
    for (let i = 0; i < leaderboard.length; i++) {
      console.log(leaderboard[i]?.name + " - " + leaderboard[i]?.rank);
    }
  });
}

async function GetPlayerRank(
  playerName: string,
  daterange: QueryDateRange,
): Promise<number> {
  let rank = 0;
  const matches = await GetPlayerMatches(playerName, daterange);

  for (let i = 0; i < matches.length; i++) {
    let match: Match | null = null;

    match = await GetMatchResult(matches[i], playerName);

    if (CheckMatchCountryCompatibility(match, _ItCountryCode) >= 2) {
      if (match?.hasWon) {
        rank = rank + 2;
      } else {
        rank = rank + 1;
      }
    }
  }
  return rank;
}

async function GetPlayerMatches(
  playerName: string,
  daterange: QueryDateRange,
): Promise<MatchId[]> {
  const parsedMatches: MatchId[] = [];
  try {
    setTimeout(() => {}, parseInt(Math.random().toString().replace(/\,/g, ""))); //  0,00 to 1,0 delay
    const response = await axios.get(
      config.api +
        "replays?" +
        "page=1&limit=100&hasBots=false&endedNormally=true" +
        "&date=" +
        daterange.start +
        "&date=" +
        daterange.end +
        "&players=" +
        playerName,
    );
    for (let i = 0; i < response.data.data.length; i++) {
      parsedMatches[i] = response.data.data[i].id as MatchId;
    }

    return parsedMatches;
  } catch (error) {
    console.log(error);

    throw Error("Error while getting matches");
  }
}

async function GetMatchResult(matchId: MatchId, playerName: string) {
  const matchData: Match = {
    id: matchId,
    loosingTeam: [],
    winningTeam: [],
  };

  try {
    setTimeout(() => {}, parseInt(Math.random().toString().replace(/\,/g, ""))); //  0,00 to 1,0 delay
    const response = await axios.get(config.api + "replays/" + matchId);

    const teams = response.data.AllyTeams;

    const winTeam: TeamMember[] = [];
    const losTeam: TeamMember[] = [];

    // Get winning and loosing team
    for (let i = 0; i < teams.length; i++) {
      for (let ii = 0; ii < teams[i].Players.length; ii++) {
        const player = teams[i].Players[ii];
        const parsedPlayer: TeamMember = {
          name: player.name,
          country: player.countryCode,
        };

        if (teams[i].winningTeam) {
          winTeam.push(parsedPlayer);

          if (parsedPlayer.name == playerName) {
            matchData.hasWon = true;
          }
        } else {
          losTeam.push(parsedPlayer);

          if (parsedPlayer.name == playerName) {
            matchData.hasWon = false;
          }
        }
      }
    }

    matchData.loosingTeam = losTeam;
    matchData.winningTeam = winTeam;
  } catch (error) {
    console.log(error);
    throw Error("Error while getting match result");
  } finally {
    return matchData;
  }
}

function CheckMatchCountryCompatibility(
  match: Match,
  countryCode: string,
): number {
  if (!match) return 0;

  let matchedPlayers = 0;
  for (let i = 0; i < match.winningTeam.length; i++) {
    if (match.winningTeam[i].country == countryCode) {
      matchedPlayers++;
    }
  }

  for (let i = 0; i < match.loosingTeam.length; i++) {
    if (match.loosingTeam[i].country == countryCode) {
      matchedPlayers++;
    }
  }

  return matchedPlayers;
}

// const listita = ["CanestroAnale"]; //lista italiani.

// function CheckTeamCountryCompatibility(team, matchCountry) {
//   //usare teams non team e ciclare teams
//   const matchedPlayers = 0;
//   //aggiunto list di nomi autorizzati ita per chi ha country non ita.
//   for (let i = 0; i < team.length; i++) {
//     if (Listcontain(listita, team[i].name) || team[i].country == matchCountry) {
//       matchedPlayers++;
//     }
//   }

//   return matchedPlayers;
// }

// function Listcontain(list, item) {
//   for (let i = 0; i < list.length; i++) {
//     if (list[i] == item) return true;
//   }
// }

async function GetLeaderboard(
  players: string[],
  daterange: QueryDateRange,
): Promise<RankedPlayer[]> {
  let lb: RankedPlayer[] = [];
  for (let i = 0; i < players.length; i++) {
    const r = await GetPlayerRank(_playersTracked[i], daterange);
    lb.push({
      name: _playersTracked[i],
      rank: r,
    });
  }

  return lb;
}

Main();
