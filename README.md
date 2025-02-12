## Honestly: fuck riot, this shitshow of a company should go down as hard as they made their way up to top of the charts of highest earning games of all time, this project will be continued to practice my skills on backend development but I'm not gonna ever play their games ever again. Fuck. Riot.

# RankedARAM

A discord bot made for me and my friends to create ourselves a little leaderboard to have a little playful competition between us.

Made using Express framework with mongoose as the library for MongoDB database.

## Technologies and libraries used:

-   JavaScript
-   NodeJS (Express)
-   MongoDB
-   mongoose
-   discord.js

## Commands list

#### List all commands and their shortened description

```
/help
```

#### Join the leaderboard by adding user's Riot account name and tag

```
/join *name*#*tag*
```

#### Leave the leaderboard by adding user's Riot account name and tag

```
/leave *name*#*tag*
```

#### Get your stats or someone's else stats by parsing in their Riot name and tag

```
/stats *name*#*tag*
```

#### Refreshes the leaderboard, made not to call API as much so it won't reach the rate limit

```
/refresh
```

#### Show the TOP 10 players in the leaderboard, sorted by score descending

```
/leaderboard
```
