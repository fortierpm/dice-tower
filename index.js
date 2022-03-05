/* ----- DOCUMENT REQUIRES ----- */
const Discord = require("discord.js"); // using v12 discord.js; v13 doesn't work with repl's version of Node.js
// const fetch = require("node-fetch"); // Only needed if using APIs.
const keepAlive = require("./server.js"); // Pulling express server keepAlive function.
const Database = require("@replit/database"); // Using Repl database for Roll List storage.

/* ----- MAJOR GLOBAL CONSTANTS ----- */
const db = new Database();
const client = new Discord.Client({
	intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES]
});

/* ----- MINOR GLOBAL CONSTANTS ----- */
const embedColor = "#d20d20";
const starterRemRolls = [["Fireball", "8d6"]];

/////////////////////////////////////////////////



/* ----- DATABASE HANDLING : Remembered Rolls Work ----- */

db.get("remRolls").then(remRolls => {
	if (!remRolls || remRolls.length < 1) {
		db.set("remRolls", starterRemRolls);
	}
});
// Add roll helper function
function addRemRoll(remRollPair) {
	db.get("remRolls").then(remRolls => {
		remRolls.push(remRollPair);
		db.set("remRolls", remRolls);
	});
}
// Delete roll helper function
function delRemRoll(remRollIndex, msg, removeError) {
	db.get("remRolls").then(remRolls => {
		if (remRolls.length > remRollIndex) {
			remRolls.splice(remRollIndex, 1);
			db.set("remRolls", remRolls);
			msg.channel.send("Removed remembered roll."); 
		} else {
			msg.reply(removeError);
		}
	});
}

/////////////////////////////////////////////////



/* ----- DISCORD CLIENT ON-READY EVENT LISTENER ----- */

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);
});


/* ----- DISCORD CLIENT ON-MESSAGE EVENT LISTENER ----- */

client.on("message", msg => {

  /* > EXIT IF MESSAGE FROM BOT */
	if (msg.author.bot) return;

	/* > BOT NAME RESPONSE */
	if (msg.content.toLowerCase().includes("dice tower")) {
		msg.channel.send("\\ (^o^) /");
		return;
	}


	// ! NOTE: Only '$' command checks past this line.
	if (!msg.content.startsWith("$")) return;


	/* > SEND ROLL LIST */
	if (msg.content === "$roll-list") {
		db.get("remRolls").then(remRolls => {
			if (remRolls.length === 0) {
				msg.channel.send(new Discord.MessageEmbed().setColor(embedColor).setDescription("*No remembered rolls.*"));
				return;
			}
			const remRollsEmbed = new Discord.MessageEmbed()
				.setColor(embedColor)
				.setTitle("Remembered Rolls")
				.addFields(remRolls.map(remRoll => {
					return {name: remRoll[0], value: remRoll[1], inline: true};
				}));
			msg.channel.send(remRollsEmbed);
		});
		return;
	}


  /* > ADD ROLL */
	if (msg.content.startsWith("$add-roll ")) {
		const addError = "I had an issue adding that roll."
		let numMem = 0;
		db.get("remRolls").then(remRolls => {
			numMem = remRolls.length;
			if (numMem >= 10) {
				msg.channel.send("Too many existing remembered rolls, can't add new roll.");
				return;
			}
			const newRollCommand = msg.content.split("$add-roll ")[1].split(", ");
			if (newRollCommand.length === 2) {
				addRemRoll(newRollCommand);
				msg.channel.send("Remembered new roll.");
				return;
			}
			msg.reply(addError)
		});
		
		return;
	}


	/* > DELETE ROLL */
	if (msg.content.startsWith("$del-roll ")) {
		const removeError = "I can't find that roll.";
		const removeCommand = msg.content.split("$del-roll ")[1];
		const isNum = /^\d+$/.test(removeCommand); // regex to check if only numbers after $del-roll
		if (isNum && !(removeCommand.startsWith("0"))) {
			delRemRoll(parseInt(removeCommand) - 1, msg, removeError); // taking into account starting index shift from 1,2,3... to 0,1,2...
			return;
		} else {
			db.get("remRolls").then(remRolls => {
				let index = -1;
				for (let i = 0; i < remRolls.length; i++) {
					if (remRolls[i][0].toLowerCase() === removeCommand.toLowerCase()) {
						index = i;
					}
				}
				if (index !== -1) {
					delRemRoll(index, msg, removeError);
					return;
				}
				msg.reply(removeError);
			});
			return;
		}
	}


	/* > ROLL COMMANDS */
	if (msg.content.startsWith("$roll")) {
		let roll = msg.content.split("$roll")[1];

    /* Simple Rolls */
		if (roll == "" || roll == " ") {
			const rollVal = (Math.floor(Math.random() * 20) + 1);
			const rollEmbed = new Discord.MessageEmbed()
				.setColor(embedColor)
				.addField(`**${rollVal}**`, `*${msg.author} - d20*`)
			msg.channel.send(rollEmbed);
			return;
		}

		/* Complex Rolls */
		if (roll.startsWith(" ")) {
			const rollInvalid = "I don't understand that roll command.";
			roll = roll.slice(1);

			/* > Database Scope */
			db.get("remRolls").then(remRolls => {
				// Replace key with command if recognized in database
				for (let i = 0; i < remRolls.length; i++) {
					if (remRolls[i][0].toLowerCase() === roll.toLowerCase()) {
						roll = remRolls[i][1];
					}
				}
				// Create roll-expression array
        const rollExp = roll.split(" ");
				// Initiate roll-value vars
				let numRolls = 0;
				let dieSides = 0;
				let rollType = "normal";
				// Check if roll-expression fits format and set numRolls and dieSides
				if (rollExp[0].startsWith("d") && /^\d+$/.test(rollExp[0].slice(1))) {
					numRolls = 1;
					dieSides = parseInt(rollExp[0].slice(1));
				} else if (/^\d+$/.test(rollExp[0].split("d")[0]) && /^\d+$/.test(rollExp[0].split("d")[1])) {
					numRolls = parseInt(rollExp[0].split("d")[0]);
					dieSides = parseInt(rollExp[0].split("d")[1]);
				}
				// Check if dieSides too large
				if (dieSides > 100) {
					msg.reply("I can't handle a die of that size.");
					return;
				}
				// Check for roll-type input
				if (rollExp[1] != undefined) {
					// Check if too many items in rollExp array
					if (rollExp[2] != undefined || numRolls < 2) {
						msg.reply(rollInvalid);
						return;
					}
					// Check that roll-type input is valid and assign rollType to proper value
					const rollExpOne = rollExp[1].toLowerCase();
					if (rollExpOne === "advantage" || rollExpOne === "disadvantage") {
						rollType = rollExpOne;
					} else if (rollExpOne === "a") {
						rollType = "advantage";
					} else if (rollExpOne === "d") {
						rollType = "disadvantage";
					} else {
						msg.reply(rollInvalid);
						return;
					}
				}
				// Check that numRolls is not zero
				if (numRolls > 0) {
					// Handle single roll requests
					if (numRolls === 1) {
						const newRoll = Math.floor(Math.random() * dieSides) + 1;
						const rollEmbed = new Discord.MessageEmbed()
							.setColor(embedColor)
							.addField(`**${newRoll}**`, `*${msg.author} - d${dieSides}*`);
						msg.channel.send(rollEmbed);
						return;
					// Handle 50 rolls and under requests
					} else if (numRolls < 51) {
						let rollArr = [];
						let result = 0;
						if (rollType === "disadvantage") {
							result = dieSides;
						}
						for (let i = 0; i < numRolls; i++) {
							const newRoll = Math.floor(Math.random() * dieSides) + 1;
							rollArr.push(newRoll);
							if (rollType === "normal") {
								result += newRoll;
							} else if (rollType === "advantage") {
								result = Math.max(result, newRoll);
							} else {
								result = Math.min(result, newRoll);
							}
						}
						const rollsString = rollArr.join(", ");
						const rollEmbed = new Discord.MessageEmbed()
							.setColor(embedColor)
							.setDescription(`*${msg.author} - ${rollExp[0]}` + (rollType !== "normal" ? (" " + rollType) : "") + "*")
							.addField(`${rollsString}`, `Result: **${result}**`, false);
						msg.channel.send(["text", rollEmbed]);
					// Handle too many rolls requests
					} else {
						msg.reply("I can't handle that many rolls.")
					}
					return;
				}
				// If you reach this point in code, roll command was invalid
				msg.reply(rollInvalid);
			});
		}
		return;
	}


	/* > RESET DATABASE */
	if (msg.content === "$database-reset") {
		db.set("remRolls", starterRemRolls);
		msg.channel.send("Dice Tower database reset.")
		return;
	}


	/* > SEND DICE TOWER COMMAND HELP */
	if (msg.content === "$help") {
		const helpEmbed = new Discord.MessageEmbed()
			.setColor(embedColor)
			.setTitle("Dice Tower Commands")
			.addFields(
				{name: "$roll", value: "Rolls a single d20."},
				{name: "$roll [num]d[sides] [opt:rolltype]", value: "Roll number of times, [num], of a choosen die [sides]. If [num] is omitted, Dice Tower will roll once. Enter 'a' or 'advantage' as an optional parameter [rolltype] for advantage roll, and 'd' or 'disadvantage' for disadvantage roll."},
				{name: "$roll-list", value: "Returns the remembered rolls list."},
				{name: "$add-roll [roll], [command]", value: "Add a remembered roll under choosen title, [roll], with a corresponding command [command]."},
				{name: "$del-roll [roll]", value: "Delete a remembered roll with title [roll] or list position integer [roll]."},
				{name: "$database-reset", value: "Reset Dice Tower's stored user input data."}
			);
		msg.channel.send(helpEmbed);
	}

});

/////////////////////////////////////////////////



/* ----- EXECUTE AND SUSTAIN PROGRAM ----- */

keepAlive(); // Keeping bot up and running w/o need for machine on and tab open
client.login(process.env.TOKEN); // Run bot; log bot on using secret discord token
