let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function userRoom(userId) {
  return `user:${userId}`;
}

function threadRoom(threadId) {
  return `thread:${threadId}`;
}

module.exports = {
  setIO,
  getIO,
  userRoom,
  threadRoom,
};
