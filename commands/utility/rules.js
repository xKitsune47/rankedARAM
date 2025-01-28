const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rules")
        .setDescription("Randomize your ARAM rules!"),
    async execute(interaction) {
        await interaction.reply(`rules`);
    },
};
