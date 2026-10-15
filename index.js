// -----------------------------------------------------------------------------
// Entry point of the IPMA integration for Gladys Assistant.
//
// Instantiates the SDK (it reads GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN
// and GLADYS_INTEGRATION_SELECTOR, injected by the Gladys supervisor), wires
// the integration (src/app.js) and connects. All the logic lives in src/.
// -----------------------------------------------------------------------------

import { GladysIntegration, createLogger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';
import { createIpmaClient } from './src/ipma.js';

const logger = createLogger({ name: 'ipma' });
const gladys = new GladysIntegration();

const app = createApp({
  gladys,
  client: createIpmaClient(),
  logger,
  // The one writable volume of the sandbox (the rootfs is read-only).
  dataDir: process.env.DATA_DIR ?? '/data',
});

gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal}: shutting down`);
  app.stop();
});

logger.info('Starting the IPMA integration');
gladys.connect().catch((err) => {
  logger.error(`Initial connection failed (${err.message})`);
  process.exit(1);
});
