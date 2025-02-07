import {
  AttachmentBuilder,
  Client,
  Events,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";
import { LocalDatabase, LocalLeague, LocalPlayer } from "../src/types";
import { createCanvas } from "@napi-rs/canvas";
import { GetLeagueData, GetPlayerData } from "../database/localQueries";
import config from "../config";
import { addDataMsg, getChannelMessages } from "../database/discordQueries";

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageTyping,
  ],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
export interface ReadyClient extends Client<true> {}

export default async function initDiscordBot(setDataCallback: (trackedPlayers: number[], league: LocalLeague, players: LocalPlayer[], bot: any) => void) {

  // Log in to Discord with your client's token
  console.log("Logging in to Discord...");

  client.once(Events.ClientReady, async (readyClient: ReadyClient) => {
    console.log(`Discord Bot Ready! Logged in as ${readyClient.user.tag}`);

    // Steps to retrieve all shared data on discord (tracked players, league, players)
    // 1. Get all the messages from trackedPlayersChannelThread and parse the content to get the tracked players lits
    // 2. Get the league data from leagueDataChannelThread (data will need to be parsed and merged because it will be split in multiple messages)
    // 3. Get the players data from playersDataChannelThread (data will need to be parsed and merged because it will be split in multiple messages)
    // 4. Store the data in the local database
    console.log("Retrieving data from Discord channel databases...");

    // Get the tracked players list
    console.log("--> tracked players list...");
    const dTrackedPlayersList: number[] = await GetDiscordTrackedPlayersList(readyClient);
    console.log("Tracked Players list:", dTrackedPlayersList);

    // Get the league data
    console.log("--> league data...");
    const dLeagueData: LocalLeague = await GetDiscordLeagueData(readyClient);
    console.log("League data:", dLeagueData);

    // Get the players data
    console.log("--> players data...");
    const dPlayersData: LocalPlayer[] = await GetDiscordPlayersData(readyClient) ?? [];
    console.log("Players data:", dPlayersData);
     
    // Store the data in the local database
    await setDataCallback(dTrackedPlayersList, dLeagueData, dPlayersData, readyClient);
    
  });
 
  return   client.login(process.env.DS_BOT_TOKEN);
}


export function DiscordUpdateLeagueData(localDatabase: LocalDatabase, readyClient: ReadyClient) {

    readyClient.channels.fetch(config.discordOptions.announcementsChannelId).then(async (channel) => {
      if (!channel) {
        console.log("Channel not found");
        return;
      }
      if (channel.isTextBased()) {
        const league = await GetLeagueData(localDatabase.league, "league");


        // Send a message to the channel "campionato-friendlyfire" with the leaderboard image
        const players: {name: string, points: number, wins: number, losses: number}[] = [];
        let playersMap: Record<string, LocalPlayer> = {};

        for await (const [playerId, playerData] of localDatabase.players.iterator()) {
          playersMap[playerId] = playerData;
        }

        for (let i = 0; i < league.leaderboard.length; i++) {
            const playerData = await GetPlayerData(localDatabase.players, league.leaderboard[i].userId);
            if(playerData.won + playerData.lost === 0) continue;
            players.push({name: playerData.name, points: league.leaderboard[i].points, wins: playerData.won, losses: playerData.lost});
        }

        const canvas = generateLeaderboardCanvas(players);
        if (canvas) {
          const resolvedCanvas = await canvas;
          const attachment = new AttachmentBuilder(
            await resolvedCanvas.encode("png"),
            { name: "leaderboard.png" }
          );
          (channel as TextChannel).send({
            files: [attachment],
            content: "Leaderboard updated!",
          });
        }

        // Update league channel database
        addDataMsg(readyClient, config.discordOptions.leagueDataChannelThreadId, JSON.stringify(league));

        // Update the players data channel database
        addDataMsg(readyClient, config.discordOptions.playersDataChannelThreadId, JSON.stringify(playersMap));

      }
    });
}

async function generateLeaderboardCanvas(
  players: { name: string; points: number, wins: number, losses: number }[]
) {
  const canvasWidth = 800;
  const canvasHeight = 60 + 80 + players.length * 60;
  const rowHeight = 60;
  const margin = 20;

  // Create a canvas
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext("2d");

  // Background color
  context.fillStyle = "#23272A"; // Discord dark mode background
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title
  context.font = "bold 30px Sans-serif";
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.fillText("Leaderboard", canvasWidth / 2, 50);

  // Draw the leaderboard rows
  players.forEach((player, index) => {
    const y = margin + 80 + index * rowHeight;

    // Background for the row
    context.fillStyle = index % 2 === 0 ? "#2C2F33" : "#99AAB5";
    context.fillRect(margin, y, canvasWidth - 2 * margin, rowHeight - 10);

    // Player name
    context.font = "bold 24px Sans-serif";
    context.fillStyle = "#ffffff";
    context.textAlign = "left";
    context.fillText(`${index + 1} ${player.name}`, margin + 20, y + rowHeight / 2);

    // Player points
    context.textAlign = "right";
    context.fillText(
      `${player.points.toFixed(1)} pts (${player.wins}/${player.wins + player.losses})`,
      canvasWidth - margin - 20,
      y + rowHeight / 2
    );
  });

  return canvas;
}

async function GetDiscordTrackedPlayersList(readyClient: ReadyClient): Promise<number[]> {
  let trackedPlayers: number[] = [];
  await readyClient.channels.fetch(config.discordOptions.trackedPlayersChannelThreadId).then(async (channel) => {
    if (!channel) {
      console.log("Tracked Players list channel not found!");
      return;
    }
    if (channel.isTextBased()) {
      await channel.messages.fetch().then((messages) => {
        messages.forEach((message) => {
          // Parse the message content to get the tracked players list 
          // (the message content is a list of ids separated by commas on each row, 
          //  each row has a comment with the player name which we don't need)
          // Some messages are server messages and must be ignored
          if (message.type !== 0) return;
          trackedPlayers =trackedPlayers.concat(message.content.split("\n").map((row) => parseInt(row.split(",")[0])));
        });
      });
    }
  });

  return trackedPlayers;
}

async function GetDiscordLeagueData(readyClient: ReadyClient): Promise<LocalLeague> {
  let league: LocalLeague = { lastMatchId: "", lastMatchStartTime: "", leaderboard: [] };
  
  league = await getChannelMessages(readyClient, config.discordOptions.leagueDataChannelThreadId) as LocalLeague;

  return league;
}

async function GetDiscordPlayersData(readyClient: ReadyClient): Promise<LocalPlayer[]> {
  let players: LocalPlayer[] = [];
  
  players = await getChannelMessages(readyClient, config.discordOptions.playersDataChannelThreadId) as LocalPlayer[];

  return players;
}

