class MessageExtractor {
  constructor(){}

  async extractAllMessages(channel, scorer){
    let count = 0;
    let hasMoreMessages = true;
    let lastMessageID = channel.lastMessageId;
    while(hasMoreMessages) {
      await channel.messages.fetch({ limit: 100, before: lastMessageID }).then(msglist => {
        let owner;
        console.log(msglist.size);
        msglist.forEach(msg =>{
          try {
            owner = msg.author.username + '#' + msg.author.discriminator;
            let mentions = msg.mentions.users; // mentioned by initial vouch
            console.log('Extracting data for ' + owner);
            mentions.map(x => {
              scorer.addPoint(msg.author.id.toString(), msg.author.username + '#' + msg.author.discriminator, x.username + '#' + x.discriminator);
            });
          }
          catch(e){
            console.log('Error with extracting data for ' + owner);
            console.log(e);
          }
          count++;
          lastMessageID = msg.id;
        });
        if(count % 100 != 0) hasMoreMessages = false;
      })
      .catch(console.error);
      console.log('Message count: ' + count);
    }
  }

}
module.exports = { MessageExtractor }