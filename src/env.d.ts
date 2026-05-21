/// <reference path="../.astro/types.d.ts" />

type ENV = {
  VAULT_BUCKET: R2Bucket;
  VAULT_PASSWORD: string;
  VAULT_SECRET: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}
