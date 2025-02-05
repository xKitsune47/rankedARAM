const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../database/models/User");
const {
    API_KEY,
    API_URL,
    dthWin,
    dthLose,
    killWin,
    killLose,
    deathWin,
    deathLose,
    participationWin,
    participationLose,
    assistWin,
    assistLose,
} = require("../../config.json");
const { roundObject } = require("../../methods/rounding");

async function fetchMatch(puuid) {
    try {
        const resMatch = await fetch(
            `${API_URL}/lol/match/v5/matches/by-puuid/${await puuid}/ids?start=0&count=1&api_key=${API_KEY}`
        );
        const match = await resMatch.json();
        return await fetchMatchData(match[0], puuid);
    } catch (err) {
        console.log(new Date().toISOString(), err);
        return "matchid";
    }
}

async function fetchMatchData(matchId, puuid) {
    try {
        const res = await fetch(
            `${API_URL}/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`
        );
        const matchData = await res.json();

        if ((await matchData.info.gameMode) !== "ARAM") {
            return;
        }

        return await processMatch(matchData, puuid);
    } catch (err) {
        console.log(new Date().toISOString(), err);
        return "matchdata";
    }
}

async function processMatch(matchData, puuid) {
    const playerNumber = matchData.metadata.participants.indexOf(puuid);

    const player = matchData.info.participants[playerNumber];

    const teamData =
        playerNumber <= 4
            ? matchData.info.participants.slice(0, 5)
            : matchData.info.participants.slice(5);

    const teamStats = {
        damage: teamData.map((p) => p.totalDamageDealtToChampions),
        tanked: teamData.map((p) => p.totalDamageTaken),
        heal: teamData.map((p) => p.totalHeal),
        participation: teamData.map((p) => p.challenges.killParticipation),
    };

    const points = calculatePlayerPoints(player, teamStats);

    return player.win
        ? {
              kills: points.kills * killWin,
              deaths: points.deaths * deathWin,
              dmg: points.dmg * dthWin,
              tanked: points.tanked * dthWin,
              heal: points.heal * dthWin,
              participation: points.participation * participationWin,
              assists: points.assists * assistWin,
              win: 25,
          }
        : {
              kills: points.kills * killLose,
              deaths: points.deaths * deathLose,
              dmg: points.dmg * dthLose,
              tanked: points.tanked * dthLose,
              heal: points.heal * dthLose,
              participation: points.participation * participationLose,
              assists: points.assists * assistLose,
              win: -50,
          };
}

// calculating points for each relevant stat
function calculatePlayerPoints(player, teamStats) {
    return {
        kills: +player.kills * 2,
        deaths: +player.deaths * -2,
        dmg: calculatePlace(
            teamStats.damage,
            player.totalDamageDealtToChampions
        ),
        tanked: calculatePlace(teamStats.tanked, player.totalDamageTaken),
        heal: calculatePlace(teamStats.heal, player.totalHeal),
        participation: calculatePlace(
            teamStats.participation,
            player.challenges.killParticipation,
            "kp"
        ),
        assists: +player.assists / 4.5,
    };
}

// calculating place points for: k/d/a/kp/healed/tanked/dealt
function calculatePlace(team, value, type) {
    const sorted = [...team].sort((a, b) => b - a);
    const position = sorted.indexOf(value) + 1;

    // points for kill participation
    if (type === "kp") {
        return Math.round(+value * 100) / 3;
    }

    // points for k/d/a/healed/tanked/dealt
    switch (position) {
        case 1:
            return 5;
        case 2:
            return 3;
        case 3:
            return 1;
        default:
            return 0;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("last")
        .setDescription("Check what gave or took away your points"),
    async execute(interaction) {
        const user = await User.findOne({ creator: interaction.user.id });
        const puuid = await user.puuid;

        const playerPoints = await fetchMatch(await puuid);

        // error handling
        if (playerPoints === "matchdata") {
            await interaction.reply(
                "Error while fetching stats for the last match"
            );
            return;
        }
        // error handling
        if (playerPoints === "matchid") {
            await interaction.reply("Error while fetching the last match's ID");
            return;
        }

        const statsToShow = [];
        statsToShow.push({
            name:
                "```" +
                `${"Total points".padEnd(16, " ")} ${roundObject(
                    playerPoints
                )}` +
                "```",
            value: ` `,
        });

        for (const [key, value] of Object.entries(playerPoints)) {
            if (key === "win") {
                statsToShow.push({
                    name:
                        "```" +
                        `${
                            value > 0
                                ? "Win".padEnd(16, " ")
                                : "Lose".padEnd(16, " ")
                        } ${`${value}`.padEnd(5, " ")}` +
                        "```",
                    value: ` `,
                });
            } else {
                const newKey = key.charAt(0).toUpperCase() + key.slice(1);
                statsToShow.push({
                    name:
                        "```" +
                        `${newKey.padEnd(16, " ")} ${`${
                            Math.round(value * 100) / 100
                        }`.padEnd(5, " ")}` +
                        "```",
                    value: ` `,
                });
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0xc8aa6e)
            .setAuthor({
                name: "RankedARAM",
                iconURL:
                    "https://brand.riotgames.com/static/a91000434ed683358004b85c95d43ce0/8a20a/lol-logo.png",
            })
            .setTitle(`Points for the last match for: ${user.accName}`)
            .addFields(statsToShow)
            .setFooter({
                text: "https://github.com/xKitsune47",
            });

        await interaction.reply({
            embeds: [embed],
        });
    },
};
