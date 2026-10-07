import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
test('official MCP client negotiates stdio, discovers tools and invokes core logic',async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../src/server.mjs',import.meta.url))]});
 const client=new Client({name:'afb-integration-test',version:'0.1.0'});
 try{
  await client.connect(transport);const {tools}=await client.listTools();assert.equal(tools.length,5);assert.ok(tools.every(x=>x.annotations.readOnlyHint));
  const contract=JSON.parse(readFileSync(new URL('../examples/product-contract.json',import.meta.url)));
  const result=await client.callTool({name:'compile_funnel_blueprint',arguments:{contract}});
  assert.equal(result.isError,undefined);assert.equal(result.structuredContent.recommendedCta,'waitlist');assert.equal(result.structuredContent.launchReview.productionAuthorized,false);
  const bad=await client.callTool({name:'review_launch_readiness',arguments:{contract:{}}});assert.equal(bad.isError,true);
 }finally{await client.close();}
});
