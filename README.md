#### 🚀 Запуск сервера

Версия `node.js` - 12.16.2, `npm` - 6.14.4

1) Cоздать файл `server-conf.json` в корневом каталоге (пример - [server-conf.example.json](server-conf.example.json)). Добавить `apiToken` - это JWT токен, необходимый для доступа к backend. Получить его можно по адресу [https://hw.shri.yandex/](https://hw.shri.yandex/). Swagger API доступен по адресу [https://hw.shri.yandex/api/](https://hw.shri.yandex/api/).
2) `npm i`
3) `npm start`

[backend-api.js](backend-api.js) - класс для работы с backend. Внутри использует `axios`. Так как сервер крайне нестабилен и часто выдаёт 500-ю ошибку, использовал `axiosRetry`.

[agent-manager.js](agent-manager.js) - класс для управления билд агентами. Для хранения агентов используется Map, где ключ - это url агента, а значение - это текущий билд (объект с полями buildId и start). Если значение null, то агент свободен.

