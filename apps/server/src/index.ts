import { createApp } from "./app.js";

const app = createApp();

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "3001");

const bootstrap = async (): Promise<void> => {
  try {
    await app.listen({ host, port });
    app.log.info(`server running at http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void bootstrap();
