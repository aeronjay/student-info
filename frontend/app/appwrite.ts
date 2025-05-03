// This file only exports Appwrite client and account objects for use in other files.
// No React component is exported here, and that's intentional.
// If you see a warning about missing default export, you can safely ignore it for this utility file.

import { Client, Account } from 'react-native-appwrite';

const client = new Client()
    .setEndpoint('https://syd.cloud.appwrite.io/v1')
    .setProject('6812e705003552d6e234')
    .setPlatform('com.aeron.studentinforeact');

const account = new Account(client);

export { client, account };