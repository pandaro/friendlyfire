// Define an interface to represent a team member
export interface PlayersMatches { [key: string]: {name?: string, teamId?: string} }
export interface PlayerMatch { name?: string, teamId: string , userId: string, matchId: string }
// Define an interface for a match
export interface Match {
  id: MatchId;
  loosingTeam: PlayersMatches;
  winningTeam: PlayersMatches;
  startTime: string;
  map: string;
  trackedPlayersIds: string[];
  gameMode: string;
}

export interface DbMatch {
  match_id: string;
  start_time: string;
  map: string;
  winning_team: string;
  game_duration: number;
  is_ranked: boolean;
  replay_id: string;
  engine: string;
  game_version: string;
  is_public: boolean;
  game_type: string;
}

export interface RankedPlayer {
  name: string;
  rank: number;
}

export type MatchId = string;

export type QueryDateRange = { start: string; end: string };
