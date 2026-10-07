import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { validateProduct,reviewReadiness,compileBlueprint,modelEconomics,evaluateExperiment,EconomicsInput } from './core.mjs';
const server=new McpServer({name:'agentic-funnel-builder',version:'0.1.0'});
const entries=[
 ['validate_product_contract','Validate supplied product structure and references, without verifying truth.',{contract:z.record(z.unknown())},x=>validateProduct(x.contract)],
 ['compile_funnel_blueprint','Compile a draft journey from a product contract. No publication.',{contract:z.record(z.unknown())},x=>compileBlueprint(x.contract)],
 ['review_launch_readiness','Find gaps in supplied evidence and delivery. Advisory only; no production authority.',{contract:z.record(z.unknown())},x=>reviewReadiness(x.contract)],
 ['model_unit_economics','Calculate labeled scenario economics, including refunds, fees, labor and acquisition.',EconomicsInput.shape,modelEconomics],
 ['evaluate_activation_experiment','Assess fixed-horizon activation counts. Approximate statistics; no rollout authority.',{experiment:z.record(z.unknown())},x=>evaluateExperiment(x.experiment)]
];
for(const [name,description,inputSchema,run] of entries){
 server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async args=>{
  try{const result=run(args);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};}
  catch(error){return {isError:true,content:[{type:'text',text:JSON.stringify({error:'invalid-input',details:error instanceof z.ZodError?error.issues.map(x=>({path:x.path.join('.'),message:x.message})):'Unable to process input'})}]};}
 });
}
await server.connect(new StdioServerTransport());
