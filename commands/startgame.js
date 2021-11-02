const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js')
const GameModel = require('../schemas/game')
const { content : questions } = require('../assets/QuiplashQuestion.json')
const ReplayModel = require('../schemas/replay')

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

    interaction.reply(createGameEmbed(game))
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
        if(game.players.length < 3) return interaction.reply({ content: 'Debe haber mínimo 3 jugadores', ephemeral: true })
        game.phase = 'answers'
        genQuestions(game)
        await game.save()
        let m = await interaction.channel.send({
          content: 'Iniciando juego'
        })
        setTimeout(() => m.delete(), 5000)
        let t = 80*1000
        interaction.update({
          ...createGameEmbed(game),
          content: 'Responde a las preguntas usando **/submit**\nTiempo restante: <t:'+Math.floor((Date.now()+t)/1000)+':R>',
          components: [
            new MessageActionRow().addComponents([
              new MessageButton().setCustomId('startgame_showQuestion').setLabel('Mostrar pregunta').setStyle(1)
            ])
          ]
        })
        for(let i = 5; i >= 0; i--)
        {
          setTimeout(async () => {
            /** @type {Object} */
            let m = await interaction.followUp({
              fetchReply: true,
              content: i == 0 ? 'Se acabó el tiempo' : `${i}`
            })
            if(i > 0)
            {
              setTimeout(() => {
                m.delete()
              }, i*1000)
            }else{
              setTimeout(() => {
                m.delete()
              }, 5000)
            }
          }, t - 1000*i)
        }
        setTimeout(() => { votingPhase(interaction, game) }, t)
      }
    },
    {
      name: 'startgame_joinGame',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(game.players.includes(interaction.user.id)) return interaction.reply({ content: "Ya estas participando en el juego", ephemeral: true })
        game.players.push(interaction.user.id)
        await game.save()

        interaction.update(createGameEmbed(game))
      }
    },
    {
      name: 'startgame_leaveGame',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(!game.players.includes(interaction.user.id)) return interaction.reply({ content: "No estas participando en el juego", ephemeral: true })
        game.players = game.players.filter(p=>p!==interaction.user.id)
        await game.save()

        interaction.update(createGameEmbed(game))
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
    },
    {
      name: 'startgame_showQuestion',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(!game.players.includes(interaction.user.id)) return interaction.reply({content: "No estas participando en este juego", ephemeral: true })
        const question = game.questions.find(q => q.users.includes(interaction.user.id) && !q.answers.find(a => a.user == interaction.user.id))
        if(question)
        {
          interaction.reply({
            content: question.prompt,
            ephemeral: true
          })
        }else{
          interaction.reply({
            content: 'Ya respondiste a todas tus preguntas\n'+game.questions.filter(q => q.users.includes(interaction.user.id)).map(q => q.prompt+'\n> '+q.answers.find(a => a.user == interaction.user.id).a).join('\n'),
            ephemeral: true
          })
        }
      }
    },
    {
      name: 'startgame_vote1',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(!game.players.includes(interaction.user.id)) return interaction.reply({content: "No estas participando en este juego", ephemeral: true })
        let q = game.questions.find(q => q.prompt == interaction.message.embeds[0].description)
        if(q?.votes.find(v => v.user == interaction.user.id)) return interaction.reply({content: 'Ya votaste', ephemeral: true})
        if(q.users.includes(interaction.user.id)) return interaction.reply({content: 'No puedes votar en las preguntas que tu respondiste', ephemeral: true })
        game.questions.find(q => q.prompt == interaction.message.embeds[0].description)?.votes.push({answer: 0, user: interaction.user.id})
        await game.save()

        interaction.reply({
          content: 'Votaste por la respuesta no. 1',
          ephemeral: true
        })
      }
    },
    {
      name: 'startgame_vote2',
      /**
      * @param {import('discord.js').MessageComponentInteraction} interaction
      * */
      async execute(client, interaction){
        const game = await GameModel.findById(interaction.channelId)
        if(!game.players.includes(interaction.user.id)) return interaction.reply({content: "No estas participando en este juego", ephemeral: true })
        let q = game.questions.find(q => q.prompt == interaction.message.embeds[0].description)
        if(q?.votes.find(v => v.user == interaction.user.id)) return interaction.reply({content: 'Ya votaste', ephemeral: true})
        if(q.users.includes(interaction.user.id)) return interaction.reply({content: 'No puedes votar en las preguntas que tu respondiste', ephemeral: true })
        game.questions.find(q => q.prompt == interaction.message.embeds[0].description)?.votes.push({answer: 1, user: interaction.user.id})
        await game.save()

        interaction.reply({
          content: 'Votaste por la respuesta no. 2',
          ephemeral: true
        })
      }
    }
  ]
}


function createGameEmbed(game){
  return {
    content: 'Esperando a más jugadores...',
    embeds: [
      new MessageEmbed()
      .setColor(0xf5c842)
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

function genQuestions(game)
{
  let players = game.players
  let genQuestion = () => questions[Math.floor(Math.random() * questions.length)]
  for(let player of players)
  {
    if(game.questions.filter(q => q.users.includes(player)).length >= 2) continue
    let avPlayers = players.filter(p => p != player)
    let question1 = genQuestion()
    while(game.questions.find(q => q.id == question1.id))
    {
      question1 = genQuestion()
    }
    let rival1N = Math.floor(Math.random()*avPlayers.length)
    let rival1 = avPlayers[rival1N]
    avPlayers.splice(rival1N, 1)
    let question2 = genQuestion()
    while(game.questions.find(q => q.id == question2.id))
    {
      question2 = genQuestion()
    }
    let rival2N = Math.floor(Math.random()*avPlayers.length)
    let rival2 = avPlayers[rival2N]
    avPlayers.splice(rival2N, 1)
    game.questions.push({...question1, users: [player, rival1]}, {...question2, users: [player, rival2]})
  }
}

function createVoteEmbed(game, question, finished)
{
  let a1 = question.answers[0]
  let a2 = question.answers[1]
  let va1 = question.votes.filter(v => v.answer == 0)
  let va2 = question.votes.filter(v => v.answer == 1)
  let u1 = a1?.user || question.users.find(u => u != a2?.user)
  let u2 = a2?.user || question.users.find(u => u != u1)
  let embed = new MessageEmbed()
    .setColor(0xf5c842)
    .setAuthor(game.name)
    .setDescription(question.prompt)
    .addField('1.- '+(a1?.a||'Sin respuesta'), finished ? `<@${u1}>\nVotes: ${va1.length}${va1.length>va2.length?'  **Ganador**':''}\n${va1.map(v => '<@'+v.user+'>')}` : '\u200b')
    .addField('2.- '+(a2?.a||'Sin respuesta'), finished ? `<@${u2}>\nVotes: ${va2.length}${va2.length>va1.length?'  **Ganador**':''}\n${va2.map(v => '<@'+v.user+'>')}` : '\u200b')
  if(va1 == va2 && finished)
  {
    embed.addField('Empate!', '\u200b')
  }
  return embed
}

function votingPhase(interaction, game)
{
  console.log(interaction)
  game.phase = 'vote'
  game.save()
  interaction.message.channel.send('Hora de votar')
    .then(w => setTimeout(() => w.delete(), 3000))
  for(let i = 0; i <= game.questions.length*2; i++)
  {
    let question = game.questions[Math.floor(i/2)]
    if(!question)
    {
      setTimeout(async () => {
        interaction.editReply({
          content: 'Juego finalizado'
        })
        let m = await interaction.channel.send({
          content: 'Juego finalizado'
        })
        setTimeout(() => m.delete(), 5000)
        game.phase = 'ended'
        new ReplayModel(game._doc).save()
        game.deleteOne()
        GameModel.deleteOne({_id: interaction.channelId})
      }, i*30*1000)
      return 'xd'
    }
    setTimeout(async () => {
      game = await GameModel.findById(interaction.channelId)
      interaction.editReply({
        content: 'Fase de votación, vota por la frase que te parezca más graciosa',
        embeds: [createVoteEmbed(game, game.questions[Math.floor(i/2)], i%2==1)],
        components: [
          new MessageActionRow().addComponents([
            new MessageButton().setCustomId('startgame_vote1').setLabel('Vote 1').setStyle(1).setDisabled(i%2==1),
            new MessageButton().setCustomId('startgame_vote2').setLabel('Vote 2').setStyle(1).setDisabled(i%2==1)
          ])
        ]
      })
      if(i%2==1)
      {
        let m = await interaction.followUp({
          content: 'Resultados de las votaciones',
          fetchReply: true
        })
        setTimeout(() => m.delete(), 10000)
      }else{
        let m = await interaction.followUp({
          content: 'Hora de votar',
          fetchReply: true
        })
        setTimeout(() => m.delete(), 10000)
      }
    }, i*30*1000)
  }
  return 'xd'
}