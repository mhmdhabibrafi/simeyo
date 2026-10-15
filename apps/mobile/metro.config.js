const {getDefaultConfig}=require('expo/metro-config');
const path=require('node:path');
const config=getDefaultConfig(__dirname);
// This repository uses separate app installs rather than npm workspaces.
config.watchFolders=[...config.watchFolders,path.resolve(__dirname,'../../packages'),path.resolve(__dirname,'../../node_modules/zod')];
module.exports=config;
