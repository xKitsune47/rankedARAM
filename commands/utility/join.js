const { SlashCommandBuilder } = require("discord.js");
const { API_KEY, API_URL } = require("../../config.json");
const { addAccount } = require("../../database/addUser.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("Joins the leaderboard")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Parse in your account name and tag")
                .setRequired(true)
        ),
    async execute(interaction) {
        let accName = interaction.options
            .getString("name")
            .replace(" ", "%20")
            .split("#");

        let msg;
        try {
            const res = await fetch(
                `${API_URL}/riot/account/v1/accounts/by-riot-id/${accName[0]}/${accName[1]}?api_key=${API_KEY}`
            );
            const data = await res.json();
            msg = await addAccount(await data, interaction.user.id);
        } catch (err) {
            console.error(err);
        }

        accName = accName.join("#").replace("%20", " ");
        if (await msg) {
            await interaction.reply(`Added **${accName}** to the database`);
        } else {
            await interaction.reply(
                `User **${accName}** already in the database!`
            );
        }
    },
};
