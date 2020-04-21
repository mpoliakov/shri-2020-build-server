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

  const value = agentManager.dismissBuild(buildId);

  await backendAPI.finishBuild({
    buildId,
    duration: new Date().getTime() - new Date(value.start).getTime(),
    success: status === `Success`,
    buildLog: stdout || stderr
  });

  console.log('Finished build:', buildId);

  return res.status(200).end();
});

server.listen(conf.port, () => {
  console.log(`Build server is listening port ${conf.port}...`);

  setTimeout(async function tick() {
    try {
      await checkBuildQueue();
    } catch (e) {
      console.log(`Error:`, e);
    }

    setTimeout(tick, 5000);
  }, 5000);
});

const checkBuildQueue = async () => {
  const agentUrl = agentManager.getFreeAgent();

  if (!agentUrl) {
    return;
  }

  const settings = await backendAPI.getSettings();
  const builds = await backendAPI.getBuilds();

  if (!builds || !settings) {
    return;
  }

  const buildsInQueue = builds.filter((b) => b.status === `Waiting`).reverse();

  console.log(`Builds in queue = ${buildsInQueue.length} | ${agentManager.getOverview()}`);

  if (!buildsInQueue.length) {
    return;
  }

  const build = buildsInQueue[0];

  console.log('Processing build:', build.id);

  try {
    const value = agentManager.assignBuild(agentUrl, build.id);

    await backendAPI.startBuild({
      buildId: build.id,
      dateTime: value.start
    });

    const buildAgentApi = axios.create({
      baseURL: agentUrl,
      timeout: 10000
    });

    await buildAgentApi.post(`/build`, {
      buildId: build.id,
      repoUrl: `git@github.com:${settings.repoName}.git`,
      commitHash: build.commitHash,
      buildCommand: settings.buildCommand
    });

    console.log(`Builds in queue = ${buildsInQueue.length - 1} | ${agentManager.getOverview()}`);
  } catch (err) {
    let log;

    if (err.response && err.response.status === 400) {
      log = err.response.data;
      agentManager.dismissBuild(build.id);
    } else {
      log = err.message;
      agentManager.delete(agentUrl);
    }

    await backendAPI.finishBuild({
      buildId: build.id,
      duration: 0,
      success: false,
      buildLog: log
    });

    console.log('Finished build:', build.id);
  }
};
