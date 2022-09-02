const { Client, Intents, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { discord_id, discord_token, command_sign, me_id, verifyCHID, botCHID, testCHID, dev, serverID } = require('../json/config.json');
const { Scorer } = require('../score/Scorer');
const { MessageExtractor } = require('../util/MessageExtractor');
const { RoleGiverManager } = require('../role/RoleGiverManager');
const { DBManager } = require('../util/DBManager');
const { SlashCommandManager } = require('./SlashCommandManager');
const fs = require('node:fs');

class VouchBot {
  constructor() {
    this.buildDependencies();
    this.buildSlashCommands();
    
    // events detection
    this.client.on('ready', () => {
      if (dev)
        this.sendMessageTo(testCHID, "**BOT IS ALIVE!!!**");
      else
        this.sendMessageTo(botCHID, "**BOT IS ALIVE!!!**");
    });

    this.client.on('messageCreate', message => {  // recent change yung messageCreate
      let msg = '';
      let authorID = message.author.id.toString();
      let authorName = message.author.username + '#' + message.author.discriminator;
      let messageCHID = message.channel.id;
      let currentlyTesting = (messageCHID == testCHID && dev);

      if (authorID === this.client.user.id) return; // if bot sent the message, ignore
      if (message.content.startsWith(command_sign + 'stats') && (messageCHID == botCHID && !dev || currentlyTesting)) {
        let count = 0;
        message.mentions.users.map(x => {
          this.scorer.getStatsEmbed(message, x);
          count++;
        });

        if (count == 0) {
          this.scorer.getStatsEmbed(message, message.author);
        }
      }
      else if (message.content.startsWith(command_sign + 'extract')) {
        console.log('Checking if admin...');
        if (authorID == me_id) { // commands from admin/me
          console.log('Data extraction from #verify-transactions starting...');
          let extractor = new MessageExtractor();
          extractor.extractAllMessages(message.channel, this.scorer, this.rolegivermngr);
          message.delete();
        }
      }
      else if (message.content.startsWith(command_sign + 'cleanroles')) { // tester for rolegiver
        if (authorID == me_id) { // commands from admin/me
          this.rolegivermngr.cleanRoleUsers(message, this.scorer);
          message.delete();
        }
      }
      else if (message.content.startsWith(command_sign + 'giverole') && dev) { // tester for rolegiver
        if (authorID == me_id) { // commands from admin/me
          this.rolegivermngr.roleCheck(10, message);
        }
      }
      else if (messageCHID == verifyCHID && !dev || currentlyTesting) { // only for vouch channel
        console.log("Processing vouch msg from " + authorName);
        // process all verifications
        // id1 sender, id2 mentioned

        // possible reply back, 1 instance
        if (message.type == 'REPLY') {
          let replyto = message.mentions.repliedUser.username + '#' + message.mentions.repliedUser.discriminator;
          this.scorer.addPoint(authorID, authorName, replyto);
        }
        else {
          // initial send
          message.mentions.users.map(x => {
            this.scorer.addPoint(authorID, authorName, x.username + '#' + x.discriminator);
          });
        }
        if (!dev)
          this.rolegivermngr.roleCheck(this.scorer.getScore(authorID), message);
      }
    });

    // handles usage of slash commands
    this.client.on('interactionCreate', async interaction => {
      if (!interaction.isChatInputCommand()) return;
    
      const { commandName } = interaction;
    
      switch (commandName) {
        case "stats": {
          console.log("stats");
          break;
        }
        case "extract": {
          console.log("extract");
          break;
        }
      }

    });
    
    this.client.login(discord_token);
  }

  sendMessageTo(chid, message) {
    let server = this.client.guilds.cache.find((g) => g.id == serverID);
    server.channels.fetch(chid).then((ch) => {
      ch.send(message).then(
        console.log(`${message} sent to #${ch.name}`)
      ).catch(console.error);
    }).catch(console.error);
  }

  /**
   * builds all classes that would do the jobs for the bot
   */
  buildDependencies(){
    this.client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES, // required daw
      ]
    });
    this.dbmngr = new DBManager();
    this.rolegivermngr = new RoleGiverManager(this.client);
    this.scorer = new Scorer(this.dbmngr);
    this.commandmngr = new SlashCommandManager();
  }

  /**
   * builds the commands to be avaialble in the guild. mostly based on the discordjs guides
   */
  buildSlashCommands(){
    this.commandmngr.loadCommands(this.client, serverID);
  }
}

module.exports = { VouchBot }