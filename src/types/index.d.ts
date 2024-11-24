// Define an interface to represent a team member
export interface TeamMember {
  name: string;
  country: string;
}
// Define an interface for a match
export interface Match {
  id: MatchId;
  loosingTeam: TeamMember[];
  winningTeam: TeamMember[];
  hasWon?: boolean;
}

export interface RankedPlayer {
  name: string;
  rank: number;
}

export type MatchId = string;

export type QueryDateRange = { start: string; end: string };
