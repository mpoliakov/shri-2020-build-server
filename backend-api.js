const axios = require('axios');
const https = require('https');
const axiosRetry = require('axios-retry');

const Routes = {
    CONF: '/conf',
    BUILD_LIST: '/build/list',
    BUILD_START: '/build/start',
    BUILD_FINISH: '/build/finish',
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

        axiosRetry(this._api, {
          retries: 5,
          retryDelay: axiosRetry.exponentialDelay
        });
    }

    async getSettings() {
        const res = await this._api.get(Routes.CONF);
        return res.data;
    }

    async getBuilds(offset = undefined, limit = 25) {
        const params = {
            offset,
            limit
        };

        const res = await this._api.get(Routes.BUILD_LIST, {params});
        return res.data;
    }

    async startBuild(startInfo) {
        await this._api.post(Routes.BUILD_START, startInfo);
    }

    async finishBuild(finishInfo) {
        await this._api.post(Routes.BUILD_FINISH, finishInfo);
    }
}

module.exports = BackendAPI;

