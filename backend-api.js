const axios = require('axios');
const https = require('https');

const BackendApiRoutes = {
    CONF: '/conf',
    BUILD_LIST: '/build/list',
    BUILD_DETAILS: '/build/details',
    BUILD_REQUEST: '/build/request',
    BUILD_START: '/build/start',
    BUILD_FINISH: '/build/finish',
    BUILD_CANCEL: '/build/cancel',
};

class BackendAPI {
    constructor(api_url, auth_token) {
        this._api = axios.create({
            baseURL: api_url,
            timeout: 10000,
            headers: {
                Authorization: 'Bearer ' + auth_token
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });

        const onSuccess = (response) => response.data;
        this._api.interceptors.response.use(onSuccess);
    }

    async getSettings() {
        const res = await this._api.get(BackendApiRoutes.CONF);
        return res.data;
    }

    async getBuildList(offset = undefined, limit = 25) {
        const params = {
            offset,
            limit
        };

        const res = await this._api.get(BackendApiRoutes.BUILD_LIST, {params});
        return res.data;
    }

    async getBuild(id) {
        const params = {
            buildId: id
        };

        const res = await this._api.get(BackendApiRoutes.BUILD_DETAILS, {params});
        return res.data;
    }

    async requestBuild(request) {
        /*{
          "commitMessage": "string",
          "commitHash": "string",
          "branchName": "string",
          "authorName": "string"
        }*/
        const res = await this._api.post(BackendApiRoutes.BUILD_REQUEST, request);
        return res.data;
    }

    async startBuild(startInfo) {
        /*{
          "buildId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "dateTime": "2020-03-17T05:12:37.344Z"
        }*/
        await this._api.post(BackendApiRoutes.BUILD_START, startInfo);
    }

    async finishBuild(finishInfo) {
        /*{
          "buildId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "duration": 0,
          "success": true,
          "buildLog": "string"
        }*/
        await this._api.post(BackendApiRoutes.BUILD_FINISH, finishInfo);
    }

    async cancelBuild(buildId) {
        /*{
          "buildId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
        }*/
        await this._api.post(BackendApiRoutes.BUILD_CANCEL, {buildId});
    }
}

module.exports = BackendAPI;

