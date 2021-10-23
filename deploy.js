require('dotenv').config()
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const fs = require('fs')

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	commands.push(command.data)
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log('Iniciando la actualización de (/) comandos de aplicación');

		await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID),
			{ body: commands },
		);

		console.log('(/) Comandos de aplicación recargados con éxito');
	} catch (error) {
		console.error(error);
	}
})();
