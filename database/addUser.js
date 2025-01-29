const mongoose = require("mongoose");
const User = require("./models/User");

// check if user already in the database
async function checkUser(id) {
    try {
        const user = await User.findOne({ puuid: id });
        if (user?.puuid === id) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

// add user to the database
async function addAccount(data, discordID) {
    const { puuid, gameName, tagLine } = data;
    try {
        // check if user already in the database
        if (await checkUser(puuid)) {
            return false;
        }

        const user = new User({
            creator: discordID,
            fullAccName: `${gameName}#${tagLine}`,
            accName: gameName,
            puuid: puuid,
            matchesId: [],
            stats: { points: 0, wins: 0, losses: 0 },
            joinTime: new Date().getTime(),
        });

        await user.save();
        return true;
    } catch (err) {
        console.error(err);
    }
}

module.exports = { addAccount };
