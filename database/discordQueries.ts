import { LocalLeague } from "../src/types";

// Create messages with new data, delete all messages in channel then create new ones with the new data
export async function addDataMsg(bot: any, channelId: string, dataContent: string) {
    // Create new messages
    // If the message is too long, split it in multiple messages (larger than 1900 characters)
    const maxMessageLength = 1900;
    const messages = [];

    while (dataContent.length > 0) {
        messages.push(dataContent.substring(0, maxMessageLength));
        dataContent = dataContent.substring(maxMessageLength);
    }

    const channel = await bot.channels.fetch(channelId);

    // Delete all messages in the channel
    await channel.messages.fetch().then((messages: any) => {
        messages.forEach(async (message: any) => {
            if(message.type !== 0) return;
            await message.delete();
        });
    });

    // Create new messages
    for (const message of messages) {
        await channel.send(message);
    }
}

export async function getChannelMessages(bot: any, channelId: string): Promise<any> {
    let msgs: string[] = [];
    await bot.channels.fetch(channelId).then(async (channel: any) => {
        if (!channel) {
            console.log("League data channel not found!");
            return;
        }
        if (channel.isTextBased()) {
            await channel.messages.fetch().then((messages: any) => {
                messages.forEach(async (message: any) => {
                    if(message.type !== 0) return;
                    if(message.content === "prenotato") return;
                    msgs.push(message.content);
                });
            });
        }
    }).catch((err: any) => {
        console.log(err);
    });

    if(msgs.length === 0) {
        console.log("No messages found in the channel");
        return;
    }
    let dataString = msgs.reverse().join("");
    console.log("Data string:", dataString);
    const data = JSON.parse(dataString);

    return data;
}


export async function getDataMsg(bot: any, channelId: string, msgId: string): Promise<{ id: any; content: any; }> {
    const channel = await bot.channels.fetch(channelId);
    const message = await channel.messages.fetch(msgId);
    return { id: message.id, content: message.content };
}

export async function editDataMsg(bot: any, channelId: string, msgId: string, dataContent: string) {
    const channel = await bot.channels.fetch(channelId);
    const message = await channel.messages.fetch(msgId);
    await message.edit(dataContent);
}

export async function deleteNote(bot: any, channelId: string, msgId: string) {
    const channel = await bot.channels.fetch(channelId);
    const message = await channel.messages.fetch(msgId);
    await message.delete();
}