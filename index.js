require('dotenv').config()
const Discord = require('discord.js')
const fs = require('fs')
const files = (str) => fs.readdirSync(str).filter(file => file.endsWith('.js'))
const path = require('path')
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI, {})

const client = new Discord.Client({
  intents: new Discord.Intents(32767)
})

files('./events').forEach(e => {
  const p = path.basename(e, '.js')
  try {
    client.on(p, require(`./events/${e}`).bind(null, client))
  }
  catch (err) {
    console.error(`Evento ${p} no funciona: ${err}`)
  }
})

client.commands = new Discord.Collection()
client.components = new Discord.Collection()
files('./commands').forEach(c => {
  const p = path.basename(c, '.js')
  try {
    const command = require(`./commands/${c}`)
    client.commands.set(p, command)
    if(command.components?.[0]) command.components.forEach(co=>client.components.set(co.name, co))
  }
  catch (err) {
    console.error(`Comando ${p} no funciona: ${err}`)
  }
})

client.on('error', (e)=>console.error(e))
client.on('warn', (w)=>console.warn(w))
client.once('ready',()=> console.log(client.user.tag))
client.login()