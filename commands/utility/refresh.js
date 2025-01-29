const { SlashCommandBuilder } = require("discord.js");
const User = require("../../database/models/User");
const { API_KEY, API_URL, match_count } = require("../../config.json");

async function fetchUserMatches(puuid) {
    try {
        const res = await fetch(
            `${API_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${match_count}&api_key=${API_KEY}`
        );
        const matches = await res.json();
        await processNewMatches(puuid, matches);
    } catch (err) {
        console.error(err);
    }
}

async function processNewMatches(puuid, matches) {
    const { matchesId, joinTime } = await User.findOne({ puuid });
    const existingMatchIds = new Set(matchesId.map((match) => match.id));

    // filter matches that have already been processed
    const newMatches = matches.filter(
        (matchId) => !existingMatchIds.has(matchId)
    );

    if (newMatches.length === 0) return;

    // process each new match
    for (const matchId of newMatches) {
        await processMatch(matchId, puuid, joinTime);
    }
}

async function processMatch(matchId, puuid, joinTime) {
    try {
        const res = await fetch(
            `${API_URL}/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`
        );
        const matchData = await res.json();

        // if mode other than aram, return
        if (matchData.info.gameMode !== "ARAM") return;

        // if time joined greater than game end time, return
        if (joinTime > matchData.info.gameEndTimestamp) return;
        await new Promise((resolve) => setTimeout(resolve, 500)); // rate limiting
        const playerNumber = matchData.metadata.participants.indexOf(puuid);

        // get all users from database
        const dbUsers = await User.find().select("puuid");
        const dbUserPuuids = new Set(dbUsers.map((user) => user.puuid));

        // processing for the team of the player
        const team =
            playerNumber <= 4
                ? matchData.info.participants.slice(0, 5)
                : matchData.info.participants.slice(5);
        await processTeam(
            team,
            dbUserPuuids,
            matchId,
            matchData.info.participants[playerNumber].challenges
                .killParticipation
        );
    } catch (err) {
        console.error(`Error processing match ${matchId}:`, err);
    }
}

async function processTeam(teamData, dbUserPuuids, matchId, ptp) {
    const relevantPlayers = teamData.filter((player) =>
        dbUserPuuids.has(player.puuid)
    );

    if (relevantPlayers.length === 0) return;

    const teamStats = {
        damage: teamData.map((p) => p.totalDamageDealtToChampions),
        tanked: teamData.map((p) => p.totalDamageTaken),
        heal: teamData.map((p) => p.totalHeal),
        deaths: teamData.map((p) => p.deaths),
        kills: teamData.map((p) => p.kills),
        participation: teamData.map((p) => p.challenges.killParticipation),
    };

    for (const player of relevantPlayers) {
        const points = calculatePlayerPoints(player, teamStats);
        await updateUserStats(player.puuid, points, player.win, matchId);
    }
}

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
    };
}

function calculatePlace(team, value, type) {
    const sorted = [...team].sort((a, b) => b - a);
    const position = sorted.indexOf(value) + 1;

    if (type === "kp") {
        return Math.round(+value * 100) / 3;
    }

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

async function updateUserStats(puuid, points, win, matchId) {
    const user = await User.findOne({
        puuid,
        "matchesId.id": matchId,
    });

    if (user) {
        console.log(`Match ${matchId} already exists for user ${puuid}`);
        return;
    }

    const updatedPoints = win
        ? {
              kills: points.kills * 1.5,
              deaths: points.deaths * -0.5,
              dmg: points.dmg * 2,
              tanked: points.tanked * 2,
              heal: points.heal * 2,
              participation: points.participation,
              win: 25,
          }
        : {
              kills: points.kills * 0.5,
              deaths: points.deaths * -1,
              dmg: points.dmg * 1,
              tanked: points.tanked * 1,
              heal: points.heal * 1,
              participation: points.participation * 0.5,
              win: -35,
          };

    const totalPoints = Object.values(updatedPoints).reduce(
        (sum, val) => sum + val,
        0
    );

    await User.updateOne(
        { puuid },
        {
            $push: { matchesId: { id: matchId, used: true } },
            $inc: {
                "stats.points": Math.round(totalPoints * 100) / 100,
                "stats.wins": win ? 1 : 0,
                "stats.losses": win ? 0 : 1,
            },
        }
    );
}

let lastRefreshTime = 0;
const COOLDOWN = 125000;
const AUTO_REFRESH_INTERVAL = 3 * 60 * 60 * 1000; // 3 godziny w milisekundach
let autoRefreshTimer; // Zmienna do przechowywania timera

// Funkcja wykonująca odświeżanie
async function performRefresh(interaction = null) {
    try {
        let users = await User.find();

        if (users.length === 0) {
            if (interaction) await interaction.editReply("No users added yet!");
            return;
        }

        // Jeśli to auto-refresh (bez interakcji), logujemy do konsoli
        if (!interaction) {
            console.log(`Starting auto-refresh for ${users.length} users...`);
        }

        for (const user of users) {
            await fetchUserMatches(user.puuid);
        }

        lastRefreshTime = Date.now();

        if (!interaction) {
            console.log(`Auto-refresh completed for ${users.length} users!`);
        }
    } catch (err) {
        console.error("Refresh error:", err);
        if (interaction?.deferred) {
            await interaction.editReply("An error occurred while refreshing!");
        } else if (interaction) {
            await interaction.reply({
                content: "An error occurred while refreshing!",
                ephemeral: true,
            });
        }
    }
}

// Funkcja do zarządzania auto-refreshem
function startAutoRefresh() {
    // Czyścimy poprzedni timer jeśli istnieje
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }

    // Ustawiamy nowy timer
    autoRefreshTimer = setInterval(performRefresh, AUTO_REFRESH_INTERVAL);
    console.log("Auto-refresh timer restarted");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("refresh")
        .setDescription("Refreshes the leaderboard"),
    async execute(interaction) {
        const now = Date.now();
        const timeElapsed = now - lastRefreshTime;
        const nextAutoRefresh = Math.ceil(
            (AUTO_REFRESH_INTERVAL - timeElapsed) / 1000 / 60
        );

        if (timeElapsed < COOLDOWN) {
            const remainingTime = Math.ceil((COOLDOWN - timeElapsed) / 1000);
            await interaction.reply({
                content: `Refresh on cooldown! Time left until another refresh may be used: ${remainingTime} seconds, next auto refresh in ${nextAutoRefresh} minutes`,
            });
            return;
        }

        try {
            await interaction.deferReply();
            let users = await User.find();

            if (users.length === 0) {
                await interaction.editReply("No users added yet!");
                return;
            }

            await interaction.editReply(
                `Starting refresh for ${users.length} users...`
            );

            await performRefresh(interaction);

            // restarting the timer after successful refresh
            startAutoRefresh();

            await interaction.editReply(
                `Successfully refreshed ${users.length} users! Next auto-refresh in 3 hours.`
            );
        } catch (err) {
            console.error(err);
            if (interaction.deferred) {
                await interaction.editReply(
                    "An error occurred while refreshing!"
                );
            } else {
                await interaction.reply({
                    content: "An error occurred while refreshing!",
                    ephemeral: true,
                });
            }
        }
    },
};
