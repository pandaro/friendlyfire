import Simple from "./src/algos/simple";
import template from "./src/algos/template";

const config: Config = {
  StartTime: "2025-01-01",//Formato valido: 2024-10-15T00:24:15.000Z
  EndTime: new Date().toISOString().toString(),//non funziona da passare alle query
  api: "https://api.bar-rts.com/",
  dataRetrievalMethod: "api",
  debugMode: false,
  initialPlayersPoints: 300,
  trackedPlayers: [
    256,  //'bio'
    212653,  //'[smile]ToxicLasagna'
    215828,  //'MrFree'
    // 216434,  //'PruritoIntimo'
    // 225304,  //'LoScimmiu'
    // 243486,  //'Ciabatta'
    // 244054,  //'soatz'
    // 258547,  //'ACanOfTuna'
    // 259841,  //'Dreamwalk'
    // 263896,  //'Astroche'
    // 264425,  //'kifer'
    // 265584,  //'ReBarbaro'
    // 280722,  //'Gattone01'
    // 283483,  //'doxop'
    // 288562,  //'Dempsy'
    // 290610,  //'IlBuff3R'
    // 290684,  //'Bardack89'
    // 290862,  //'Sult4'
    292542,  //'[ETC]ThePunisher8731'
    292568,  //'[ETC]Ralos90'
    298063,  //'SuperShallo338'
    2902,  //'[GAJ]b0ns'
    3074,  //'Flaka'
    // 6930,  //'Screzio'
    // 7195,  //'Furious_Porcupine'
    // 9834,  //'thefallen5555'
    // 13642,  //'ANTIHUMAN'
    // 19929,  //'PerAsperaAdAstra'
    // 21505,  //'Wildcat'
    // 21949,  //'pyro066'
    // 26124,  //'Ruggi'
    // 39616,  //'ADAW'
    // 39779,  //'Denny00'
    // 40361,  //'DavideBlade'
    // 41483,  //'[ITA]Sbuffox'
    // 41491,  //'TeoPorco'
    // 45360,  //'Stelfirio'
    // 55787,  //'FarmerKit'
    // 58274,  //'PocoRiso'
    // 81003,  //'Uniforce'
    // 82235,  //'Disprosio'
    // 89223,  //'neuris'
    // 89323,  //'Sbrock'
    // 90038,  //'[SG]CMDR_Zod'
    // 92522,  //'goris'
    // 99194,  //'isbad234'
    106915,  //'cacioimperatore'
    114674,  //'gabibo'
    // 115941,  //'jettop'
    // 118978,  //'Miksa'
    // 129365,  //'Madashi'
    // 144769,  //'Genny4Real'
    // 145294,  //'JustSomeGuy'
    // 152637,  //'Babbux'
    // 164528,  //'[GAJ]farmagio'
    // 176510,  //'[DmE]Daniilcola'
    // 176559,  //'NewPlayer1'
    // 176776,  //'LiveviL'
    177687,  //'JarmenEnza'
    177924,  //'GrandiCasso'
    179932,  //'Shimada'
    185508,  //'[GAJ]Eddyff1988'
    190417,  //'Mavericko'
    191510,  //'Pitti_Uomo'
    202326,  //'ITALIA'
    202374,  //'CanestroAnale'
    // 205325,  //'Ale1199'
    // 209507,  //'[FDL]Panikz'
    // 212542,  //'Mr_T4k'
    // 212556,  //'Fra'
    // 212631,  //'Luken'
    // 290972,  //'Lowi'
    // 300380,  //'paglamo'
    // 299994,  //'sborrasuprema1'
    // 300382,  //'Snatone'
    // 215118,  //'StuPedasso'
    // 265587,  //'Wyrdstain'  probabile estero
    // 270132,  //'rotahell11' probabile estero
    // 299993,  //'IlBlaze'
    // 88920,   //'Babygay'
    // 102435,  //'AlathZ'
    // 21400,   //'hojo'
    // 111939,  //'aladipollo'
    // 132880,  //'unorthodox-flagshipenjoier'
    // 142872,  //'pollo'
    // 300326,  //'agentepeppow'
    // 85699,   //'3ss3'
    // 295189,  //'spaam'
    // 147330,  //'prese_3'
    // 62528,   //'Alempsio'
    // 198167,   //'Blackskull93'
    // 198171,   //'Castoro'
    // 227107   //'NGobbux'
  ],
  usedAlgorithm: Simple,
};

export default config;
interface Config {
  EndTime: string;
  StartTime: string;
  api: string;
  trackedPlayers: number[];
  usedAlgorithm: Function;
  dataRetrievalMethod?: 'api' | 'dumpDb';
  debugMode?: boolean;
  initialPlayersPoints?: number;
}
