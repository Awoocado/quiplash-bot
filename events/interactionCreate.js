/**
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Interaction} interacion
 */

 module.exports = async (client, interaction) => {
  let command

  switch (interaction.type) {
  case 'APPLICATION_COMMAND':
    command = client.commands.get(interaction.commandName)
    break
  case 'MESSAGE_COMPONENT':
    command = client.components.get(interaction.customId)
    break
  }

  if (!command) return
  try {
    await command.execute(client, interaction)
  }
  catch (error) {
    console.error(error)
    await interaction.reply({ content: `¡Ocurrió un error al ejecutar este comando!\n${error}`, ephemeral: true })
  }
}