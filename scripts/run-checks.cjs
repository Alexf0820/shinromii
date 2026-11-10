const {readdirSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
for(const file of readdirSync(__dirname).filter(file=>/^verify-.*\.cjs$/.test(file)).sort()) {
  const result=spawnSync(process.execPath,[`${__dirname}/${file}`],{stdio:'inherit'});
  if(result.status!==0) process.exit(result.status??1);
}
