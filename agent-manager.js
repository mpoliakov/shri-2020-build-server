class AgentManager {
  constructor() {
    this._agents = new Map();
  }

  register(host, port) {
    const url = `${host}:${port}`;

    if (this._agents.has(url)) {
      return `Build agent ${url} is already registered.`;
    } else {
      this._agents.set(url, null);
      return `Build agent ${url} was successfully registered.`;
    }
  }

  delete(url) {
    this._agents.delete(url);
  }

  assignBuild(url, buildId) {
    const value = {
      buildId,
      start: new Date().toISOString()
    };

    this._agents.set(url, value);
    return value;
  }

  dismissBuild(buildId) {
    for (let [key, value] of this._agents) {
      if (value && value.buildId === buildId) {
        this._agents.set(key, null);
        return value;
      }
    }
  }

  getFreeAgent() {
    const freeAgentUrls = [];

    for (let [key, value] of this._agents) {
      if (!value) {
        freeAgentUrls.push(key);
      }
    }

    if (!freeAgentUrls.length) {
      return;
    }

    const randomIndex = Math.floor(freeAgentUrls.length * Math.random());
    return  freeAgentUrls[randomIndex];
  }

  getOverview() {
    const freeAgents = [];
    const busyAgents = [];

    for (let [key, value] of this._agents) {
      if (value) {
        busyAgents.push(key);
      }
      else {
        freeAgents.push(key);
      }
    }

    return `Free agents = ${freeAgents.length} | Busy agents = ${busyAgents.length}`;
  }
}

module.exports = AgentManager;

