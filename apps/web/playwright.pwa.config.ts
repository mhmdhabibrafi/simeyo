import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./pwa-tests',workers:1,timeout:120000,expect:{timeout:30000},use:{baseURL:'http://localhost:3001',trace:'retain-on-failure',...devices['Desktop Chrome']},reporter:[['list']]});
