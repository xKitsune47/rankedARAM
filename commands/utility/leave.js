const { SlashCommandBuilder } = require("discord.js");
const User = require("../../database/models/User");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Leaves the leaderboard")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Parse in your account name and tag")
                .setRequired(true)
        ),
    async execute(interaction) {
        const userRequesting = await User.findOne({
            creator: interaction.user.id,
        });

        const userDesired = interaction.options.getString("name");

        if (userRequesting.fullAccName === userDesired) {
            await User.deleteOne({ creator: interaction.user.id });
            await interaction.reply(
                `Removed **${userDesired}** from the database!`
            );
        } else {
            await interaction.reply(
                `You didn't create the **${userDesired}** user!`
            );
        }
    },
};
