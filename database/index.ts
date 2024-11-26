import { Database, TableData } from "duckdb-async";
import { Match } from "../src/types";
import { TypedArray } from "apache-arrow/interfaces";

async function initDatabase(): Promise<Database> {
  const db = await Database.create(":memory:");

  // note; doesn't work on Windows yet
    // db.exec(`INSTALL arrow; LOAD arrow;`, (err: any) => {
    // if (err) {
    //   console.warn(err);
    //   return;
    // }

    // Query to create matches database
    const createMatchesTableQuery = `
        CREATE TABLE Matches (
            id STRING,
            loosingTeam STRING,
            winningTeam STRING,
            startTime STRING,
            map STRING,
            trackedPlayersIds STRING,
            gameMode STRING
        )
    `;

    // Create Matches table
     db.run(createMatchesTableQuery);
  

  return db;
}

// Insert Match data row into Matches table
export async function insertMatch(db: Database, match: Match): Promise<void> {
    console.log("cacca pupu", match.loosingTeam.toString())
    const query = `
        INSERT INTO Matches
        VALUES (
        '${match.id}',
        '${match.loosingTeam.toString()}',
        '${match.winningTeam.toString()}',
        '${match.startTime}',
        '${match.map}',
        '${match.trackedPlayersIds}',
        '${match.gameMode}'
        )
    `;
    
    
    const queryResponse = await db.run(query, (err: any) => {
        if (err) {
            console.warn(err);
            return;
        }
    });
    console.log("inserted match", match.id);

}

export default initDatabase;
