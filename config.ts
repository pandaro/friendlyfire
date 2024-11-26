import SimpleAlgo from "./src/algos/simple";

const config: Config = {
  api: "https://api.bar-rts.com/",
  trackedPlayers: [
    "bio",
    "CanestroAnale",
    "gabibo",
    "[smile]ToxicLasagna",
    "Fra",
    "goris",
    "cacioimperatore",
    "[DmE]Daniilcola",
    "JarmenEnza",
    "[GAJ]b0ns",
    "[GAJ]D_Nutria",
    "FarmerKit",
    "Ale1199",
    "[ETC]Ralos90",
    "[ETC]ThePunisher8731",
    "Doxop",
    "Flaka",
    "Furious_Porcupine",
    "Gattone01",
    "Senzascopo",
    "Jenny4Real",
  ],
  usedAlgorithm: SimpleAlgo,
};

export default config;

interface Config {
  api: string;
  trackedPlayers: string[];
  usedAlgorithm: Function;
}
