const log = (state, message = '') => {
  if (message) {
    message = ' - ' + message;
  }
  console.log(`| Builds in queue = ${state.buildQueue.length} | ${state.agents.getStatus()} |${message}`);
};

module.exports = {
  log
};
