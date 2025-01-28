const { SlashCommandBuilder } = require("discord.js");
const User = require("../../database/models/User");
const { API_KEY, API_URL, match_count } = require("../../config.json");

async function fetchUserMatches(puuid) {
    try {
        const res = await fetch(
            `${API_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${match_count}&api_key=${API_KEY}`
        );
        const matches = await res.json();
        await addMatches(puuid, await matches);
    } catch (err) {
        console.error(err);
    }
    return;
}

async function addMatches(puuid, matches) {
    const { matchesId } = await User.findOne({ puuid: puuid });
    let matchesToAdd = [];
    await matches.map((match) => {
        if (!matchesId.map((mtch) => mtch.id).includes(match) && !match.used) {
            matchesToAdd.push({ id: match, used: false });
        }
    });

    const processedMatches = await Promise.all(
        matchesToAdd.map(async (match) => {
            try {
                const aram = await fetchMatchDetails(match.id, puuid);
                if (aram) {
                    return { id: match.id, used: true };
                }
                return null;
            } catch (error) {
                console.error(`Error processing match ${match.id}:`, error);
                return null;
            }
        })
    );

    const validMatches = processedMatches.filter((match) => match !== null);

    await User.updateOne(
        { puuid: puuid },
        { matchesId: [...matchesId, ...validMatches] }
    );
}

// function used for
async function userLogic(data, puuid, teamData) {
    const playerNumber = await data.metadata.participants.indexOf(puuid);

    const {
        totalDamageTaken,
        totalDamageDealtToChampions,
        totalHeal,
        deaths,
        kills,
        assists,
        win,
    } = data.info.participants[await playerNumber];

    const placesPoints = {
        dmg: +calculatePlace(
            teamData.map((player) => player.totalDamageDealtToChampions),
            totalDamageDealtToChampions
        ),
        tanked: +calculatePlace(
            teamData.map((player) => player.totalDamageTaken),
            totalDamageTaken
        ),
        heal: +calculatePlace(
            teamData.map((player) => player.totalHeal),
            totalHeal
        ),
        deaths: +calculatePlace(
            teamData.map((player) => player.deaths),
            deaths
        ),
        kills: +calculatePlace(
            teamData.map((player) => player.kills),
            kills
        ),
        assists: +calculatePlace(
            teamData.map((player) => player.assists),
            assists
        ),
    };

    updateUser(placesPoints, puuid, win);
}

// calculate player place in the ranking amongst their team
function calculatePlace(team, player) {
    team.sort((a, b) => a - b);
    switch (team.indexOf(player) + 1) {
        case 1:
            return 3;
        case 2:
            return 2;
        case 3:
            return 1;
        case 4:
            return 0;
        case 5:
            return 0;
        default:
            return 0;
    }
}

async function fetchMatchDetails(matchId, puuid) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
        const res = await fetch(
            `${API_URL}/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`
        );
        const data = await res.json();
        if (data.info.gameMode === "ARAM") {
            const playersInDB = await User.find().select("puuid");
            const playerNumber = await data.metadata.participants.indexOf(
                puuid
            );

            const teamData =
                playerNumber >= 5
                    ? data.info.participants.slice(5)
                    : data.info.participants.slice(0, 5);

            teamData.forEach((player) => {
                if (
                    playersInDB.map((plyr) => plyr.puuid).includes(player.puuid)
                ) {
                    userLogic(data, player.puuid, teamData);
                }
            });

            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function updateUser(points, puuid, win) {
    await User.updateOne(
        { puuid: puuid },
        {
            $set: {
                "stats.points": Object.values(points).reduce(
                    (a, b) => a + b,
                    0
                ),
            },
            $inc: {
                "stats.wins": win ? 1 : 0,
                "stats.losses": win ? 0 : 1,
            },
        }
    );
}

let lastRefreshTime = 0;
const COOLDOWN = 125000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("refresh")
        .setDescription("Refreshes the leaderboard"),
    async execute(interaction) {
        const now = Date.now();
        const timeElapsed = now - lastRefreshTime;

        if (timeElapsed < COOLDOWN) {
            const remainingTime = Math.ceil((COOLDOWN - timeElapsed) / 1000);
            await interaction.reply(
                `Refresh on cooldown! Time left until another refresh may be used: ${remainingTime} seconds`
            );
            return;
        }

        try {
            const allUsers = await User.find({});

            if ((await allUsers.length) === 0) {
                await interaction.reply("No users added yet!");
                return;
            }

            const userPuuids = await allUsers.map((user) => {
                return user.puuid;
            });

            userPuuids?.forEach((puuid) => {
                fetchUserMatches(puuid);
            });

            lastRefreshTime = now;
            await interaction.reply(`Refreshed ${allUsers.length} users`);
        } catch (err) {
            console.error(err);
            await interaction.reply("An error occurred while refreshing!");
        }
    },
};
