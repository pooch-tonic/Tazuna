const { Client, GatewayIntentBits } = require("discord.js");
const { TOKEN, COPY_COMMAND, COPY_FROM_CHANNEL_ID, COPY_TO_CHANNEL_ID, MSG_FETCH_LIMIT } = require("./settings.json");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on("ready", () => {
  console.log("Bot is ready!");
  const channel = client.channels.cache.get(COPY_FROM_CHANNEL_ID);
  getMessages(channel, MSG_FETCH_LIMIT);
});

const getMessages = async (channel, limit) => {
  const sum_messages = [];
  let last_id;

  while (true) {
    const options = { limit: 100 };
    if (last_id) {
      options.before = last_id;
    }

    const messages = await channel.messages.fetch(options);

    if (messages.size === 0) break;

    sum_messages.push(...messages.values());
    last_id = messages.last()?.id;
    console.log(
      "fetched",
      sum_messages.length + " messages - last ID:",
      last_id
    );

    if (messages.size < 100 || sum_messages.length >= limit) {
      break;
    }
  }

  sum_messages.reverse(); // Reverse the array to maintain chronological order
  processMessages(sum_messages);
};

const processMessages = (messages) => {
  const toChannel = client.channels.cache.get(COPY_TO_CHANNEL_ID);
  sendMessagesInOrder(0, messages, toChannel);
};

const sendMessagesInOrder = (currIndex, messages, channel) => {
  if (currIndex >= messages.length) {
    console.log("===== END OF LOOP =====");
    return;
  }

  let canPost = true;
  const msg = messages[currIndex];

  if (msg.content === COPY_COMMAND) canPost = false;

  if (msg.content?.length < 1 && msg.attachments.size < 1) canPost = false;

  if (canPost) {
    const date = msg.createdAt
      .toISOString()
      .replace(/T/, " ")
      .replace(/\..+/, "");
    const userID = msg.author.id;
    let formattedMessage = `### [${date}] <@${userID}>:
${msg.content}`;
    if (formattedMessage.length >= 2000) {
      formattedMessage = formattedMessage.slice(0, 1994);
      formattedMessage += "[...]";
    }

    const attachmentsArray = [...msg.attachments.values()];
    channel
      .send({
        files:
          attachmentsArray.length > 0
            ? attachmentsArray.map((e) => e.url)
            : null,
        content: formattedMessage,
      })
      .then(() => {
        console.log(`posted message ${currIndex + 1}/${messages.length}`);
      })
      .catch((e) => {
        console.error("failed to send message:", msg.id, e);
      })
      .finally(() => {
        sendMessagesInOrder(currIndex + 1, messages, channel);
      });
  } else if (msg.type === 7) {
    const date = msg.createdAt
      .toISOString()
      .replace(/T/, " ")
      .replace(/\..+/, "");
    const userID = msg.author.id;
    let formattedMessage = `### [${date}] <@${userID}> joined the server!`;
    if (formattedMessage.length >= 2000) {
      formattedMessage = formattedMessage.slice(0, 1994);
      formattedMessage += "[...]";
    }
    channel
      .send({
        content: formattedMessage,
      })
      .then(() => {
        console.log(`posted message ${currIndex + 1}/${messages.length}`);
      })
      .catch((e) => {
        console.error("failed to send message:", msg.id, e);
      })
      .finally(() => {
        sendMessagesInOrder(currIndex + 1, messages, channel);
      });
  } else {
    console.log(`skipped message ${currIndex + 1}/${messages.length}`);
    sendMessagesInOrder(currIndex + 1, messages, channel);
  }

  
};

client.login(TOKEN);
