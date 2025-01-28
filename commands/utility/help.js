const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("List all commands with their description"),
    async execute(interaction) {
        const commandsList = [
            { name: "help", desc: "hElP!" },
            {
                name: "join",
                desc: "Join the leaderboard by parsing in your Riot account name and tag: **name**#**tag**",
            },
            { name: "leaderboard", desc: "Check the leaderboard" },
            {
                name: "leave",
                desc: "Leaves the leaderboard, you need to parse in your Riot account name and tag: **name**#**tag**",
            },
            {
                name: "refresh",
                desc: "Refreshes the leaderboard for everyone in the database",
            },
            { name: "rules", desc: "T B D" },
            {
                name: "stats",
                desc: "Check your or the desired person's stats by parsing in their Riot account name and tag: **name**#**tag**",
            },
        ];

        const normalizedCommands = [];

        commandsList.map((command) => {
            normalizedCommands.push({
                name: "```" + `${command.name}` + "```",
                value: ` ${command.desc}`,
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
            .addFields(normalizedCommands)
            .setFooter({
                text: "https://github.com/xKitsune47",
            });

        await interaction.reply({
            embeds: [embed],
        });
    },
};
