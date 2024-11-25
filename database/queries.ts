
/* Simpliest query to test the connection 
SELECT user_id
FROM 'https://data-marts.beyondallreason.dev/players.parquet'
WHERE name = 'CanestroAnale'
*/

import { Database } from "duckdb-async";
import { DbMatch, PlayersMatches, PlayerMatch } from "../src/types";

export async function LoadPlayersIds(db: Database, trackedPlayers: string[]): Promise<PlayersMatches> {
    const parsedPlayers = trackedPlayers.map(player => `'${player}'`).join(',');
    const query = `
    SELECT user_id, name
    FROM 'https://data-marts.beyondallreason.dev/players.parquet'
    WHERE name IN (${parsedPlayers})
    `;
    
    let players: PlayersMatches = {};

    const ps = await db.all(query);

    for (let i = 0; i < ps.length; i++) {
        players[ps[i].user_id] = {name: ps[i].name};
      }

    return players;
}

export async function LoadPlayersInMatch(db: Database, matchId: string): Promise<PlayerMatch[]> {
    const query = `
    SELECT user_id, team_id
    FROM 'https://data-marts.beyondallreason.dev/match_players.parquet'
    WHERE match_id = '${matchId}'
    `;
    
    let players: PlayerMatch[] = [];

    const ps = await db.all(query);

    for (let i = 0; i < ps.length; i++) {
        players[i] = { teamId: ps[i].team_id as string, userId: ps[i].user_id as string, matchId: matchId};
      }

    return players;
}

export async function LoadLeagueMatchIds(db: Database, playersMatches: PlayersMatches, startTime?: string): Promise<PlayerMatch[]> {
    const parsedPlayers = Object.keys(playersMatches).map(player => `'${player}'`).join(',');
    const query = `
        SELECT match_id, team_id, user_id
        FROM 'https://data-marts.beyondallreason.dev/match_players.parquet'
        WHERE user_id IN ('256','2902','3074','7195','55787','92522','106915','114674','176510','177687','202374','205325','212556','212653','280504','280722','292542','292568')
        AND match_id IN (
            SELECT match_id
            FROM 'https://data-marts.beyondallreason.dev/match_players.parquet'
            WHERE user_id IN (${parsedPlayers})
            GROUP BY match_id
            HAVING COUNT(*) > 1
        )
        ORDER BY match_id;
    `;

    let matches: PlayerMatch[] = [];

    const ms = await db.all(query);

    for (let i = 0; i < ms.length; i++) {
        matches[i] = {name: playersMatches[ms[i].user_id].name, teamId: ms[i].team_id as string, userId: ms[i].user_id as string, matchId: ms[i].match_id as string};
    }

    return matches;
}

export async function LoadMatches(db: Database, matchIds: string[], startTime: string): Promise<DbMatch[]> {
    const parsedMatches = matchIds.map(match => `'${match}'`).join(',');
    const query = `
    SELECT *
    FROM 'https://data-marts.beyondallreason.dev/matches.parquet'
    WHERE match_id IN (${parsedMatches}) AND start_time >= '${startTime}';
    `;

    // AND start_time >= '${startTime}'

    let matches: DbMatch[] = [];

    const ms = await db.all(query);

    matches = ms as DbMatch[];

    return matches;


}