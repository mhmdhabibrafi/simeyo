import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./mobile-tests',workers:1,timeout:240000,expect:{timeout:30000},use:{baseURL:'http://localhost:8081',trace:'retain-on-failure',actionTimeout:20000,navigationTimeout:180000,...devices['Desktop Chrome'],viewport:{width:390,height:844}},reporter:[['list']]});
