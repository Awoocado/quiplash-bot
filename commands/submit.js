const GameModel = require('../schemas/game')

module.exports = {
  data: {
    name: 'submit',
    description:'Dar una respuesta',
    options: [
      {
        type: 3,
        name: "respuesta",
        description: "Escribe la respuesta",
        required: true
      },
    ],
    default_permission: true,
    type: 1
  },
  /**
  * @param {import('discord.js').Client} client
  * @param {import('discord.js').CommandInteraction} interaction
  * */
  async execute(client, interaction){
    const game = await GameModel.findById(interaction.channelId)
    if(!game) return interaction.reply({ content: 'No hay un juego activo en este canal', ephemeral: true })
    if(!game.players.includes(interaction.user.id)) return interaction.reply({content: "No estas participando en este juego", ephemeral: true })
    const question = game.questions.find(q => q.users.includes(interaction.user.id) && !q.answers.find(a => a.user == interaction.user.id))
    if(question)
    {
      game.questions[game.questions.indexOf(question)].answers.push({a: interaction.options.get('respuesta').value, user: interaction.user.id})
      const newQuestion = game.questions.find(q => q.users.includes(interaction.user.id) && !q.answers.find(a => a.user == interaction.user.id))
      interaction.reply({
        content: question.prompt+'\n> '+interaction.options.get('respuesta').value+'\nSiguiente pregunta:\n'+(newQuestion?newQuestion.prompt:'Ya respondiste a todas tus preguntas'),
        ephemeral: true
      })
      await game.save()
    }else{
      interaction.reply({
        content: 'Ya respondiste a todas tus preguntas\n'+game.questions.filter(q => q.users.includes(interaction.user.id)).map(q => q.prompt+'\n> '+q.answers.find(a => a.user == interaction.user.id).a).join('\n'),
        ephemeral: true
      })
    }
  }
}