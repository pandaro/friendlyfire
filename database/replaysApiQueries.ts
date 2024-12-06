import config from "../config.js";
import axios from "axios";
import { Match, MatchId, QueryDateRange, RankedPlayer } from "../src/types";


const _ItCountryCode = "IT";

export async function GetPlayerMatchesIds(
    playerName: string,
    dateRange: QueryDateRange,
): Promise<MatchId[]> {
    
    const parsedMatches: MatchId[] = [];
    try {
        setTimeout(() => { }, parseInt(Math.random().toString().replace(/\,/g, ""))); //  0,00 to 1,0 delay

        const response = await axios.get(
            config.api +
            "replays?" +
            "page=1&limit=200&hasBots=true&endedNormally=true" +
            "&date=" +
            dateRange.start +
            "&players=" +
            playerName,
        );

        console.log(response)

        for (let i = 0; i < response.data.data.length; i++) {
            parsedMatches[i] = response.data.data[i].id as MatchId;
        }

        return parsedMatches;
    } catch (error) {
        console.log(error);
        throw Error("Error while getting matches");
    }
}

export async function GetMatchData(matchId: MatchId): Promise<Match> {
    const matchData: Match = {
        id: matchId,
        loosingTeam: [],
        winningTeam: [],
        startTime: "",
        map: "",
        gameMode: ""
    };
    try {
        setTimeout(() => { }, parseInt(Math.random().toString().replace(/\,/g, ""))); //  0,00 to 1,0 delay

        const response = await axios.get(config.api + "replays/" + matchId);
        const teams = response.data.AllyTeams;
        const winTeam = [];
        const losTeam = [];

        // Get winning and loosing team
        for (let i = 0; i < teams.length; i++) {
            for (let ii = 0; ii < teams[i].Players.length; ii++) {
                const player = teams[i].Players[ii];

                if (player.countryCode == _ItCountryCode) {
                    if (teams[i].winningTeam) {
                        winTeam.push(player.userId);
                    } else {
                        losTeam.push(player.userId);
                    }
                }

            }
        }

        matchData.loosingTeam = losTeam;
        matchData.winningTeam = winTeam;
        matchData.id = response.data.hostSettings.server_match_id;
        matchData.startTime = response.data.startTime;
        matchData.map = response.data.hostSettings.mapname;
        matchData.gameMode = response.data.preset;

        console.log(matchData)
    } catch (error) {
        console.log(error);
        throw Error("Error while getting match data");
    } finally {
        return matchData;
    }
}