import { Plugin, Request } from 'sfn';

declare global {
    namespace app {
        namespace plugins {
            namespace web {
                const onView: Plugin<Request>;
            }
        }
    }
}

app.plugins.web.onView.bind(async (req) => {
    app.services.logger.instance().log(`Client IP: ${req.ip}, URL: ${req.url}`);
});