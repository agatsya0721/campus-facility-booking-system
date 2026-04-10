let ioRef = null;

export const setIo = (io) => {
  ioRef = io;
};

export const getIo = () => {
  if (!ioRef) {
    throw new Error("Socket.io is not initialized.");
  }

  return ioRef;
};
