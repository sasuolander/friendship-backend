import knex from '../utils/db';

const chatroomFields = ['id', 'userCreatorId', 'userReceiverId'];

export const dbGetChatrooms = () => knex('chatrooms').select(chatroomFields).orderBy('id', 'asc');

export const dbGetAllMsWithChatroomId = chatroomId =>
knex('messages')
  .select()
  .where({ chatroomId });
export const dbGetAllMsFromChatrooms = () =>
knex('chatrooms')
.join('messages', 'chatrooms.id', 'messages.chatroomId')
.join('users as u1', 'messages.userId', 'u1.id')
//.join('users as u2', 'chatrooms.userReceiverId', 'u2.id')
.select('messages.chatroomId', 'messages.userId as userCreatorId', 'u1.username as userCreatorName', 'messages.textMessage', 'messages.chatTime')
.orderBy('chatrooms.id', 'asc');
export const dbCreateChatroom = ({ ...fields }) =>
knex('chatrooms')
    .insert(fields)
    .returning('*')
    .then(results => results[0]); // return only first result

