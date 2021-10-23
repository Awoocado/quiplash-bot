const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js')
const GameModel = require('../schemas/game')

module.exports = {
  data: {
    name: 'startgame',
    description:'Empezar un juego en el canal actual',
    options: [
      {
        type: 3,
        name: "name",
        required: true, 
        description: "Nombre de la partida",
      },
      //{
      //  type: 5,
      //  name: "familyFriendly",
      //  description: "Contenido apto para toda la familia"
      //},
      //{
      //  type: 4,
      //  name: "maxMembers",
      //  required: true,
      //  description: "Cantidad máxima de jugadores"
      //},
      //{
      //  type: 4,
      //  name: "rounds",
      //  description: "Cantidad de rondas"
      //},
      //{
      //  type: 5,
      //  name: "spectators",
      //  description: "Permitir espectadores"
      //},
    ],
    default_permission: true,
    type: 1
  },
  /**
  * @param {import('discord.js').Client} client
  * @param {import('discord.js').CommandInteraction} interaction
  * */
  async execute(client, interaction){
    if(!interaction.member) return interaction.reply('Todos los comando de este bot solo se pueden usar en servidores. 🥑')
    if(!client.guilds.cache.has(interaction.guildId)) return interaction.reply('El bot tiene que estar presente para poder funcionar.')
    
    let game = await GameModel.findById(interaction.channelId).lean()
    if(game) return interaction.reply({ content: "Ya hay un juego en curso", ephemeral: true })

    game = await new GameModel({
      _id: interaction.channelId,
      name: interaction.options.get('name').value,
      players: [interaction.user.id],
      familyFriendly: false
    }).save()

    interaction.reply(createGameEmbed(interaction, game))
  },
  components: [
    {
      name: 'startgame_startGame',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(game.players[0] !== interaction.user.id) return interaction.reply({ content: "Usted no puede iniciar el juego", ephemeral: true })

      }
    },
    {
      name: 'startgame_joinGame',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(game.players.includes(interaction.user.id)) return interaction.reply({ content: "Ya estas participando del juego", ephemeral: true })
        game.players.push(interaction.user.id)
        await game.save()

        interaction.update(createGameEmbed(interaction, game))
      }
    },
    {
      name: 'startgame_leaveGame',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(!game.players.includes(interaction.user.id)) return interaction.reply({ content: "No estas participando del juego", ephemeral: true })
        game.players = game.players.filter(p=>p!==interaction.user.id)
        await game.save()

        interaction.update(createGameEmbed(interaction, game))
      }
    },
    {
      name: 'startgame_stopGame',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(game.players[0] !== interaction.user.id) return interaction.reply({ content: "Usted no puede detener el juego", ephemeral: true })
        await GameModel.deleteOne({_id: interaction.channelId})
        interaction.update({
          content: "No pos, ya no vamo' a jugar",
          embeds: [],
          components: []
        })
      }
    }
  ]
}


function createGameEmbed(interaction, game){
  return {
    embeds: [
      new MessageEmbed()
      .setColor('RANDOM')
      .setAuthor(game.name)
      .setDescription(`Jugadores:\n${game.players.map(p=>`> - <@${p}>`).join('\n')}`)
    ],
    components: [
      new MessageActionRow().addComponents([
        new MessageButton().setCustomId('startgame_startGame').setLabel('Iniciar').setStyle(3),
        new MessageButton().setCustomId('startgame_joinGame').setLabel('Unirse').setStyle(1)
      ]),
      new MessageActionRow().addComponents([
        new MessageButton().setCustomId('startgame_leaveGame').setLabel('Salir').setStyle(4),
        new MessageButton().setCustomId('startgame_stopGame').setLabel('Terminar').setStyle(4),
      ])
    ]
  }
}