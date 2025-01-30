import {
  AttachmentBuilder,
  Client,
  Events,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";
import { LocalDatabase } from "../src/types";
import { createCanvas } from "@napi-rs/canvas";
import { GetLeagueData, GetPlayerData } from "../database/localQueries";

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
interface ReadyClient extends Client<true> {}

export default async function initDiscordBot(localDatabase: LocalDatabase) {
  client.once(Events.ClientReady, (readyClient: ReadyClient) => {
    console.log(`Discord Bot Ready! Logged in as ${readyClient.user.tag}`);

    // Get the last message on the channel "campionato-friendlyfire"
    readyClient.channels.fetch("1313143385657446430").then(async (channel) => {
      if (!channel) {
        console.log("Channel not found");
        return;
      }
      if (channel.isTextBased()) {
        channel.messages.fetch({ limit: 1 }).then((messages) => {
          console.log(
            `Last message content:`,
            messages.first()?.content
          );
        });

        const league = await GetLeagueData(localDatabase.league, "league");


        // Send a message to the channel "campionato-friendlyfire" with the leaderboard image
        const players: {name: string, points: number}[] = [];

        for (let i = 0; i < league.leaderboard.length; i++) {
            const playerData = await GetPlayerData(localDatabase.players, league.leaderboard[i].userId);
            if(playerData.won + playerData.lost === 0) continue;
            players.push({name: playerData.name, points: league.leaderboard[i].points});
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
      }
    });
  });

  // Log in to Discord with your client's token
  client.login(process.env.DS_BOT_TOKEN);
}

async function generateLeaderboardCanvas(
  players: { name: string; points: number }[]
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
    context.fillText(player.name, margin + 20, y + rowHeight / 2);

    // Player points
    context.textAlign = "right";
    context.fillText(
      `${player.points} pts`,
      canvasWidth - margin - 20,
      y + rowHeight / 2
    );
  });

  return canvas;
}
