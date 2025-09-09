class OnlineUsersService {
  constructor() {
    this.users = new Map(); // userId -> { socket, username, status }
  }

  addUser(userId, username, socket) {
    this.users.set(userId, {
      socket,
      username,
      status: 'available'
    });
    return this.getOnlineUsers();
  }

  removeUser(userId) {
    this.users.delete(userId);
    return this.getOnlineUsers();
  }

  getOnlineUsers() {
    return Array.from(this.users.entries()).map(([id, data]) => ({
      id,
      username: data.username,
      status: data.status
    }));
  }

  updateUserStatus(userId, status) {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      return true;
    }
    return false;
  }

  getUserSocket(userId) {
    return this.users.get(userId)?.socket;
  }
}

module.exports = new OnlineUsersService();
