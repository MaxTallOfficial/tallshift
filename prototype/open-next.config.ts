import {defineCloudflareConfig} from '@opennextjs/cloudflare';

// Dynamic app: no cloud R2/KV/queue is provisioned for caching by this configuration.
export default {
  ...defineCloudflareConfig(),
  buildCommand: 'npm run build:web',
};
