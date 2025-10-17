const inMemoryCache: Record<String, Node.Timeout> = {}

function webhook(message: object) {
    // all the rest of your webhook code
    // if (messageIsFromCustomer) {
    //     logMessage(message, "CUSTOMER")
    // } else {
    //     const messageInDB = findMessageInDB
    //     if (!messageInDB) log(message, "HUMAN")
    // }

    // check if the message has queue to send to instagram
    if (inMemoryCache[message.conversation_id]) {
        clearTimeout(inMemoryCache[message.conversation_id])
    }


    inMemoryCache[message.conversation_id] = setTimeout(async () => {
        // Function to pull latest message from the instagram dm
        const latestMessages = await pullLatestMessagesFromInstagramDm()

        // // check if the latest message is still the same as the one we are trying to reply to
        const latestMessagesSent = latestMessages.at(-1)
        const isLastMessageFromCustomer = latestMessagesSent?.sender_id != "instagram_owner_id"


        // if not the same, means a new message came in 
        // now check from the event message received to the latest messages
        // to see if our [USER] didn't respond and AI also didn't respond
        // if both didn't respond, we can safely reply to the user
        // Cause all messages in between are from same [CUSTOMER]
        // const isAllCustomerMessages = latestMessages.every(msg => msg.id === message.id)

        if (isLastMessageFromCustomer) {
            // process the message and send the reply
            await processAndReplyUserWithAIGeneratedMessage(message)
        }

        // EXTRA PRECAUTIONARY CHECK FOR AI AND USER REPLIES
        // TO BE DISCUSSED LATER

        // clear the cache
        clearTimeout(inMemoryCache[message.conversation_id])
        delete inMemoryCache[message.uniqueDmId]
    }, 3000)


}


const pullLatestMessagesFromInstagramDm = async () => {
    // code to pull the latest 10 messages from the instagram dm
}

const generateAPIResponse = async (messages: Array<object>) => {
    // code to generate the API response
}

const sendToInstagram = async (response: object) => {
    // code to send the response to instagram
}

const processAndReplyUserWithAIGeneratedMessage = async (messages: object[]) => {
    // code to run the reply user process

    // generate the API response
    const response = await generateAPIResponse(messages)

    // send the response to instagram
    const messegeRES = await sendToInstagram(response)
    logMessage(messegeRES, "AI")
}

async function logMessage(message: object, role: AI | HUMAN | CUSTOMER) {

    const log = {
        ...message,
    }

}

async function findMessageInDB(messageid) {

}