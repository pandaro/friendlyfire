# friendlyfire

Tools to promote the Italian community gameplay with friendly fire.

Friendlyfire is a set of tools designed to create a cooperative league within the Italian BAR (Beyond All Reason) community.

---

## Development

This project is built with **Node.js** and written in **TypeScript**. It uses the **api.bar-rts.com** to fetch match data and stores it in a **DuckDB** database for local processing. Optionally, it integrates with a **Discord bot** for leaderboard updates and community interaction.

### Prerequisites

Make sure you have the following installed:

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **DuckDB** (used as the local database)
- **Discord bot token** (if running in Discord integration mode)

### Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/friendlyfire.git
   cd friendlyfire
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Start the project:
   ```bash
   npm run start
   ```

### Development Workflow

- After making changes to the code, rebuild the project:
  ```bash
  npm run build
  ```
- To run the project in development mode with live reload, use:
  ```bash
  npm run dev
  ```

---

## Running a New Season

To start a new season, follow these steps:

1. **Update the Configuration**:

   - Open the `config.ts` file and update the following fields:
     - `StartTime`: Set the start date of the new season.
     - `EndTime`: Set the end date of the new season.
     - `trackedPlayers`: Update the list of player IDs to track for the new season.

2. **Reset the Database**:

   - If you want to start fresh, clear the local database by deleting the `friendlyfire.duckdb` file or running a reset script (if available).

3. **Run the Script**:

   - Start the project as usual:
     ```bash
     npm run start
     ```

4. **Monitor Progress**:
   - The script will fetch match data, process it, and update the leaderboard. Check the logs for progress and debugging.

---

## Databases

This project uses two main databases:

1. **Local Database (DuckDB)**:

   - Stores player data, match data, and league information.
   - Located in the project directory as `friendlyfire.duckdb`.
   - Used for fast local queries and processing.

2. **Discord Integration (Optional)**:
   - If enabled, the Discord bot updates the leaderboard and allows interaction with the community.
   - Requires a valid Discord bot token and configuration.

---

## Running Modes

The project supports two main running modes:

1. **API Mode**:

   - Fetches match data from the **api.bar-rts.com**.
   - Suitable for real-time updates and live tracking.
   - Configure the `dataRetrievalMethod` in `config.ts` to `"api"`.

2. **Dump Database Mode**:
   - Processes match data from a pre-downloaded database dump.
   - Useful for offline analysis or processing historical data.
   - Configure the `dataRetrievalMethod` in `config.ts` to `"dumpDb"`.

---

## Discord Integration

If `RUN_DS_BOT` is set to `1` in the `.env` file, the project will initialize the Discord bot. The bot allows:

- Updating the leaderboard in a Discord channel.
- Interacting with the community for match data and stats.

To enable Discord integration:

1. Add your Discord bot token to the `.env` file:

   ```env
   DISCORD_TOKEN=your-discord-bot-token
   RUN_DS_BOT=1
   ```

2. Start the project:
   ```bash
   npm run start
   ```

---

## Debugging

To enable debug mode, set the `DEBUG_PLAYER` environment variable to the name of the player you want to debug:

```bash
DEBUG_PLAYER=player_name npm run start
```

This will log detailed information about the specified player's matches and points calculations.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

---
