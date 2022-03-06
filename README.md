# Dice Tower
### Custom Javascript Discord Bot

![Dice Tower Screenshot](https://i.imgur.com/m4dbXdi.png)
Above: Demonstrating (1) the help menu and (2) explicit roll commands


![Dice Tower Screenshot](https://i.imgur.com/oM0b0CV.png)
Above: Demonstrating "Remembered Rolls" bot database with player input capabilities


![Dice Tower Screenshot](https://i.imgur.com/4PGX9IQ.png)
Above: Demonstrating (1) "Remembered Rolls" database use with custom roll commands and (2) uncaught missing/invalid bot command feedback



## Discord bot database and constant operation
This discord bot is hosted on [Replit](https://replit.com) within a Node.js Repl. It uses Replit's optional built-in database to host and manage the bot's "Remembered Rolls" list. I also use a Replit Secret (environment variable) to protect the bots private token.

In order to keep this bot running even while I'm not logged in to Replit, I've used Replit's Express webserver capabilities where I host Dice Tower's code. To ensure Replit never closes this temporary webserver, I've created a monitor on [UptimeRobot](https://uptimerobot.com/) to make a request every five-minutes at the webserver URL.

#### Inspired by freeCodeCamp
[freeCodeCamp Video](https://youtu.be/7rU_KyudGBY)
