const { getIO, userRoom, threadRoom } = require('./socket.service');

function emitThreadUpdate(thread, message) {
  const io = getIO();
  if (!io || !thread) return;

  const payload = {
    thread_id: thread.thread_id,
    property_id: thread.property_id,
    owner_user_id: thread.owner_user_id,
    participant_user_id: thread.participant_user_id,
    last_message_at: message.created_at,
    last_message_text: message.message_text,
  };

  io.to(userRoom(thread.owner_user_id)).emit('chat:thread_updated', payload);
  io.to(userRoom(thread.participant_user_id)).emit('chat:thread_updated', payload);
}

function emitNewMessage(thread, message) {
  const io = getIO();
  if (!io || !thread || !message) return;

  const payload = {
    thread_id: thread.thread_id,
    message,
  };

  io.to(threadRoom(thread.thread_id)).emit('chat:new_message', payload);
  io.to(userRoom(thread.owner_user_id)).emit('chat:new_message', payload);
  io.to(userRoom(thread.participant_user_id)).emit('chat:new_message', payload);

  emitThreadUpdate(thread, message);
}

function emitReadReceipt(thread, readerUserId, markedCount) {
  const io = getIO();
  if (!io || !thread) return;

  const payload = {
    thread_id: thread.thread_id,
    reader_user_id: readerUserId,
    marked_count: markedCount,
  };

  io.to(threadRoom(thread.thread_id)).emit('chat:read_receipt', payload);
  io.to(userRoom(thread.owner_user_id)).emit('chat:read_receipt', payload);
  io.to(userRoom(thread.participant_user_id)).emit('chat:read_receipt', payload);
}

module.exports = {
  emitNewMessage,
  emitReadReceipt,
};
