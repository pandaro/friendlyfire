import { Store, Database } from "@keyvhq/core";

// Define an interface to represent a team member
export interface PlayersMatches { [key: string]: {name?: string, teamId?: string} }
export interface PlayerMatch { name?: string, teamId: string , userId: string, matchId: string }
// Define an interface for a match
export interface Match {
  id: MatchId;
  loosingTeam: string[];
  winningTeam: string[];
  teamSize: number;
  playersCount:number;
  startTime: string;
  map: string;
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
  playersCount: number;
}

export interface RankedPlayer {
  name: string;
  rank: number;
}

export interface LocalDatabase extends Database {
  matches: Store<MatchId, Match>;
  players: Store<string, any>;
  league: Store<string, any>;
}

export interface LocalPlayer {
  name: string;
  points: number;
  won: number;
  lost: number;
  wins: { [key: string]: number }; // TODO: da togliere
  maps: { [key:string]:number}
  losses: { [key: string]: number };
  teamMates: { [key: string]: number }; // TODO: da togliere
  encounters: { [key: string]: number };
  mode: { [key: string]: number };
  unclaimedPoints: number;
  id: number;
}

export interface LocalMatch {
  id: string;
  startTime: string;
  map: string;
  gameMode: string;
  winningTeam: string[];
  loosingTeam: string[];
}

export interface LocalLeague {
  lastMatchId: string;
  lastMatchStartTime: string;
  leaderboard: {userId: string, points: number}[];
}

export type MatchId = string;

export type QueryDateRange = { start: string; end: string };
