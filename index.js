const express = require('express');
const axios = require('axios');

const conf = require('./server-conf');
const BackendAPI = require('./backend-api');
const AgentManager = require('./agent-manager');
const {log} = require('./utils');

const backendAPI = new BackendAPI(conf.apiBaseUrl, conf.apiToken);

const state = {
  settings: null,
  buildQueue: [],
  agents: new AgentManager()
};

const server = express();
server.use(express.json());

server.post(`/notify-agent`, async (req, res) => {
  const url = `${req.body.host}:${req.body.port}`;
  if (state.agents.register(url)) {
    log(state, `Build agent ${url} was successfully registered.`);
  }
  return res.status(200).end();
});

server.post(`/notify-build-result`, async (req, res) => {
  const {
    buildId,
    status,
    stdout,
    stderr
  } = req.body;

  const value = state.agents.dismissBuild(buildId);

  await backendAPI.finishBuild({
    buildId,
    duration: new Date().getTime() - new Date(value.start).getTime(),
    success: status === `Success`,
    buildLog: stdout || stderr
  });

  log(state, `Finished build [${buildId}].`);

  return res.status(200).end();
});

server.listen(conf.port, async () => {
  console.log(`Build server is listening port ${conf.port}...`);

  state.settings = await backendAPI.getSettings();

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
  const agentUrl = state.agents.getFreeAgent();

  if (!agentUrl) {
    return;
  }

  if (!state.buildQueue.length) {
    const builds = await backendAPI.getBuilds();
    state.buildQueue.push(...builds);
    if (state.buildQueue.length) {
      log(state, `Fetched builds from database.`);
    }
  }

  if (!state.buildQueue.length) {
    return;
  }

  const build = state.buildQueue.shift();

  const value = state.agents.assignBuild(agentUrl, build.id);

  log(state, `Processing build [${build.id}] on build agent ${agentUrl}...`);

  try {
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
      repoUrl: `git@github.com:${state.settings.repoName}.git`,
      commitHash: build.commitHash,
      buildCommand: state.settings.buildCommand
    });
  } catch (err) {
    let message;

    if (err.response && err.response.status === 400) {
      message = err.response.data;
      state.agents.dismissBuild(build.id);
    } else {
      message = err.message;
      state.agents.delete(agentUrl);
    }

    await backendAPI.finishBuild({
      buildId: build.id,
      duration: 0,
      success: false,
      buildLog: message
    });

    log(state, `Finished build [${build.id}].`);
  }
};
