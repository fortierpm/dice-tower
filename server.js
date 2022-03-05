const express = require("express");
const server = express();

// Respond to all http requests
server.all("/", (req, res) => {
	res.send("Bot is running!");
});

// Server at port 3000
function keepAlive() {
	server.listen(3000, () => {
		console.log("Server is ready.");
	});
}

module.exports = keepAlive;
