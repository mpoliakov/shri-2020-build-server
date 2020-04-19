const express = require('express');
const axios = require('axios');

const conf = require('./server-conf');
const BackendAPI = require('./backend-api');
const AgentManager = require('./agent-manager');

const backendAPI = new BackendAPI(conf.apiBaseUrl, conf.apiToken);
const agentManager = new AgentManager();

const server = express();
server.use(express.json());

server.post(`/notify-agent`, async (req, res) => {
  const message = agentManager.register(req.body.host, req.body.port);
  return res.status(200).json(message);
});

server.post(`/notify-build-result`, async (req, res) => {
  const {
    buildId,
    status,
    stdout,
    stderr
  } = req.body;

  const value = agentManager.free(buildId);

  await backendAPI.finishBuild({
    buildId,
    duration: new Date().getTime() - new Date(value.start).getTime(),
    success: status === `Success`,
    buildLog: stdout || stderr
  });

  return res.status(200).end();
});

server.listen(conf.port, () => {
  console.log(`Build server is listening port ${conf.port}...`);

  setTimeout(async function tick() {
    try {
      await checkBuildQueue();
      // console.log(`Available build agents:`, agentManager._agents);
    } catch (e) {
      console.log(`Error:`, e.message);
    }

    setTimeout(tick, 5000);
  }, 5000);
});

const checkBuildQueue = async () => {
  const agentUrl = agentManager.getFreeAgent();

  if (!agentUrl) {
    console.log(`There are no available build agents.`);
    return;
  }

  const settings = await backendAPI.getSettings();
  const builds = await backendAPI.getBuildList();

  if (!builds || !settings) {
    return;
  }

  const waitingBuilds = builds.filter((b) => b.status === `Waiting`);

  if (!waitingBuilds.length) {
    console.log(`Build queue is empty.`)
    return;
  }

  const build = waitingBuilds[waitingBuilds.length - 1];

  const buildAgentApi = axios.create({
    baseURL: agentUrl,
    timeout: 5000
  });

  try {
    await buildAgentApi.post(`/build`, {
      buildId: build.id,
      repoUrl: `git@github.com:${settings.repoName}.git`,
      commitHash: build.commitHash,
      buildCommand: settings.buildCommand
    });

    const value = agentManager.busy(agentUrl, build.id);

    await backendAPI.startBuild({
      buildId: build.id,
      dateTime: value.start
    });
  } catch {
    agentManager.unregister(agentUrl);
  }
};
