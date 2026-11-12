#!/usr/bin/env bun
process.env.ASTRO_TELEMETRY_DISABLED = '1';
if (!process.env.XDG_CONFIG_HOME) {
  process.env.XDG_CONFIG_HOME = '/tmp/.config';
}
import { cli } from './node_modules/astro/dist/cli/index.js';
cli(process.argv);

