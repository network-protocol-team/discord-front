export const logClient = (msg) => {
  console.log(`[DEBUG]: ${msg}`);
};

// async-await 버전 setTimeout
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
