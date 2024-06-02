//═══════════════════════════════════════════════════════//
//
//                              M@TRIX MD
//                                    BY MATRIX TECH TEAM
//
//════════════════════════════//

require('./settings')
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, proto } = require("@adiwajshing/baileys")
const { state, saveState } = useSingleFileAuthState(`./auth_info.json`)
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const yargs = require('yargs/yargs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require('./lib/myfunc')
const low = require('lowdb')
const { Low, JSONFile } = low
const mongoDB = require('./lib/mongoDB')

// Global API and DB setup
global.api = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '')

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.db = new Low(
  /https?:\/\//.test(opts['db'] || '') ?
    new cloudDBAdapter(opts['db']) : /mongodb/.test(opts['db']) ?
      new mongoDB(opts['db']) :
      new JSONFile(`database/database.json`)
)
global.db.data = {
  users: {},
  chats: {},
  database: {},
  game: {},
  settings: {},
  others: {},
  sticker: {},
  ...(global.db.data || {})
}

// Save database every 30 seconds
if (global.db) setInterval(async () => {
  if (global.db.data) await global.db.write()
}, 30 * 1000)

// Main function to start the bot
async function startBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion()
  const bot = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['BotName', 'Safari', '1.0.0'],
    auth: state
  })

  store.bind(bot.ev)

  bot.ws.on('CB:call', async (json) => {
    const callerId = json.content[0].attrs['call-creator']
    if (json.content[0].tag == 'offer') {
      let pa7rick = await bot.sendContact(callerId, global.owner)
      bot.sendMessage(callerId, { text: `Automatic Block System!\nDon't Call Bot!\nPlease Ask Or Contact The Owner To Unblock You!` }, { quoted: pa7rick })
      await sleep(8000)
      await bot.updateBlockStatus(callerId, "block")
    }
  })

  bot.ev.on('messages.upsert', async chatUpdate => {
    try {
      const mek = chatUpdate.messages[0]
      if (!mek.message) return
      mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
      if (mek.key && mek.key.remoteJid === 'status@broadcast') return
      if (!bot.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
      if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
      const m = smsg(bot, mek, store)
      require("./handler")(bot, m, chatUpdate, store)
    } catch (err) {
      console.log(err)
    }
  })

  bot.ev.on('groups.update', async pea => {
    try {
      const ppgc = await bot.profilePictureUrl(pea[0].id, 'image')
      const wm_fatih = { url: ppgc }
      const groupUpdateText = (pea[0].announce ? "Group has been closed by admin. Only admins can send messages now!" : "Group has been opened by admin. Participants can send messages now!")
      await bot.send5ButImg(pea[0].id, `「 Group Settings Changed 」\n\n${groupUpdateText}`, `Group Settings Change Message`, wm_fatih, [])
    } catch {
      // Handle error
    }
  })

  bot.ev.on('group-participants.update', async (anu) => {
    try {
      const metadata = await bot.groupMetadata(anu.id)
      const participants = anu.participants
      for (let num of participants) {
        let ppuser
        try {
          ppuser = await bot.profilePictureUrl(num, 'image')
        } catch {
          ppuser = 'https://i0.wp.com/www.gambarunik.id/wp-content/uploads/2019/06/Top-Gambar-Foto-Profil-Kosong-Lucu-Tergokil-.jpg'
        }

        const nama = await bot.getName(num)
        const memb = metadata.participants.length
        const Kon = await getBuffer(`https://hardianto.xyz/api/welcome3?profile=${encodeURIComponent(ppuser)}&name=${encodeURIComponent(nama)}&bg=https://telegra.ph/file/8bbe8a7de5c351dfcb077.jpg&namegb=${encodeURIComponent(metadata.subject)}&member=${encodeURIComponent(memb)}`)
        const Tol = await getBuffer(`https://hardianto.xyz/api/goodbye3?profile=${encodeURIComponent(ppuser)}&name=${encodeURIComponent(nama)}&bg=https://telegra.ph/file/8bbe8a7de5c351dfcb077.jpg&namegb=${encodeURIComponent(metadata.subject)}&member=${encodeURIComponent(memb)}`)
        if (anu.action == 'add') {
          bot.sendMessage(anu.id, { image: Kon, contextInfo: { mentionedJid: [num] }, caption: `⭐✑ Hi👋 @${num.split("@")[0]},\n⭐✑ Welcome To ${metadata.subject}\n⭐✑ Description: ${metadata.desc}\n⭐✑ Welcome To Our Comfortable Happy😋, Sometimes Loud😜, Usually Messy🤥, Full Of Love🥰, HOME😌!!` })
        } else if (anu.action == 'remove') {
          bot.sendMessage(anu.id, { image: Tol, contextInfo: { mentionedJid: [num] }, caption: `⭐✑ @${num.split("@")[0]} Left ${metadata.subject}\n⭐✑ I'm Not Sure If It Was A Goodbye Charm, But It Was Fun While It Lasted 😌✨` })
        }
      }
    } catch (err) {
      console.log(err)
    }
  })

  bot.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {}
      return decode.user && decode.server && decode.user + '@' + decode.server || jid
    } else return jid
  }

  bot.ev.on('contacts.update', update => {
    for (let contact of update) {
      const id = bot.decodeJid(contact.id)
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
    }
  })

  bot.getName = (jid, withoutContact = false) => {
    const id = bot.decodeJid(jid)
    withoutContact = bot.withoutContact || withoutContact
    let v
    if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
      v = store.contacts[id] || {}
      if (!(v.name || v.subject)) v = await bot.groupMetadata(id) || {}
      resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
    })
    else v = id === '0@s.whatsapp.net' ? {
      id,
      name: 'WhatsApp'
    } : id === bot.decodeJid(bot.user.id) ?
      bot.user :
      (store.contacts[id] || {})
    return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
  }

  bot.sendContact = async (jid, kon, quoted = '', opts = {}) => {
    const list = []
    for (let i of kon) {
      list.push({
        displayName: await bot.getName(i + '@s.whatsapp.net'),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${await bot.getName(i + '@s.whatsapp.net')}\nTEL;type=CELL;type=VOICE;waid=${i}:${PhoneNumber('+' + i).getNumber('international')}\nEND:VCARD`
      })
    }
    bot.sendMessage(jid, { contacts: { displayName: `${list.length} Contacts`, contacts: list }, ...opts }, { quoted })
  }

  bot.public = true

  bot.serializeM = (m) => smsg(bot, m, store)

  bot.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete session and Scan Again`); bot.logout(); }
      else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); startBot(); }
      else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); startBot(); }
      else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); bot.logout(); }
      else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Scan Again And Run.`); bot.logout(); }
      else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); startBot(); }
      else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); startBot(); }
      else bot.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`)
    }
    console.log('Connected...', update)
  })

  bot.ev.on('creds.update', saveState)

  // Add custom commands or other functionalities here
  // Example command handler:
  bot.on('chat-update', async (message) => {
    if (!message.hasNewMessage) return
    message = message.messages.all()[0]
    if (!message.message) return
    if (message.key && message.key.remoteJid == 'status@broadcast') return
    const content = JSON.stringify(message.message)
    const from = message.key.remoteJid
    const type = Object.keys(message.message)[0]
    const { text, extendedText, contact, location, liveLocation, image, video, sticker, document, audio, product } = MessageType

    if (type === 'conversation' && message.message.conversation.startsWith('!ping')) {
      bot.sendMessage(from, 'Pong!', text)
    }

    // Add more commands as needed
  })
}

startBot()
