const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../database/models/User");

function winrate(wins, losses) {
    if (wins === 0 && losses === 0) {
        return "No matches played yet";
    } else {
        return `${Math.floor((+wins / (+wins + +losses)) * 100)}%`;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Get stats!")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Type in the desired account name")
                .setRequired(false)
        ),
    async execute(interaction) {
        const temp = interaction.options.getString("name");
        let dbData;

        if (!temp) {
            dbData = await User.findOne({
                creator: interaction.user.id,
            });
        } else {
            if (temp.includes("#")) {
                dbData = await User.findOne({
                    fullAccName: temp,
                });
            } else {
                dbData = await User.findOne({
                    accName: temp,
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
            .setTitle(`${dbData.fullAccName}`)
            .addFields(
                { name: "**Points**", value: `${dbData.stats.points}` },
                {
                    name: "**Wins**",
                    value: `${dbData.stats.wins}`,
                    inline: true,
                },
                {
                    name: "**Losses**",
                    value: `${dbData.stats.losses}`,
                    inline: true,
                },
                {
                    name: "**Winrate**",
                    value: `${winrate(dbData.stats.wins, dbData.stats.losses)}`,
                }
            )
            .setFooter({
                text: "https://github.com/xKitsune47",
            });

        await interaction.reply({
            embeds: [embed],
        });
    },
};
