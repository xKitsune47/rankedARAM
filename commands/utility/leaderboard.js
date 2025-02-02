const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../database/models/User");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Who's on top?"),
    async execute(interaction) {
        const users = await User.find({});
        const sortedUsers = await users
            .map((user) => {
                return {
                    name: user.accName,
                    points: user.stats.points,
                };
            })
            .sort((a, b) => b.points - a.points);

        const usersToShow = [];

        sortedUsers.map((user, i) => {
            if (i > 9) return;
            usersToShow.push({
                name:
                    "```" +
                    `${user.name.padEnd(16, " ")} ${
                        Math.round(user.points * 100) / 100
                    }` +
                    "```",
                value: ` `,
            });
        });

        const embed = new EmbedBuilder()
            .setColor(0xc8aa6e)
            .setAuthor({
                name: "RankedARAM",
                iconURL:
                    "https://brand.riotgames.com/static/a91000434ed683358004b85c95d43ce0/8a20a/lol-logo.png",
            })
            .setTitle(`Leaderboard`)
            .addFields(usersToShow)
            .setFooter({
                text: "https://github.com/xKitsune47",
            });

        await interaction.reply({
            embeds: [embed],
        });
    },
};

// placeholder function for future use for calculating player's rank to show
function calculateRank(points) {
    switch (points) {
        case points:
            break;

        default:
            break;
    }
}
