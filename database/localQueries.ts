
import { Database } from "duckdb-async";
import { Match } from "../src/types";

// Get local matches from the database
async function LoadLocalMatches(db: Database, matchIds: string[], startTime?: string): Promise<Match[]> {
    const query = `
        SELECT *
        FROM Matches
        WHERE match_id IN (${matchIds.map(id => `'${id}'`).join(',')})
        ${startTime ? `AND start_time >= '${startTime}'` : ''}
        ORDER BY start_time DESC;
    `;

    const matches: Match[] = await db.all(query) as Match[];

    return matches.map((m) => {
        return {
            id: m.id,
            loosingTeam: JSON.parse(m.loosingTeam.toString()),
            winningTeam: JSON.parse(m.winningTeam.toString()),
            startTime: m.startTime,
            map: m.map,
            trackedPlayersIds: JSON.parse(m.trackedPlayersIds.toString()),
            gameMode: m.gameMode
        } as Match;
    });
}