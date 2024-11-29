import SemiCompetitiveAlgo from "./src/algos/semi_competitive_bio";

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
    "doxop",
    "Flaka",
    "Furious_Porcupine",
    "Gattone01",
    "Senzascopo",
    "Jenny4Real",
    "malsi",
    "PruritoIntimo",
    "neuris",
    "TeoPorco",
    "Ruggi",
    "Uniforce",
    "NewPlayer1",
    "Wildcat",
    "ANTIHUMAN",
    "Shimada",
    "Babbux",
    "DavideBlade",
    "Genny4Real",
    "GrandiCasso",
    "ITALIA",
    "jettop",
    "Madashi",
    "mark_Karl",
    "Prese3",
    "Stelfirio",
    "Sult4",
    "thefallen5555",
  ],
  usedAlgorithm: SemiCompetitiveAlgo,
};

export default config;

interface Config {
  api: string;
  trackedPlayers: string[];
  usedAlgorithm: Function;
}
