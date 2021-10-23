module.exports = {
  data: {
    name: 'submit',
    description:'Dar una respuesta',
    options: [
      {
        type: 3,
        name: "respuesta",
        description: "Escribe la respuesta",
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
  
  }
}