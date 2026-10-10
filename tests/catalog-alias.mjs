const TARGET = "@agentic-income/catalog";
const LOCAL = new URL("../packages/catalog/dist/index.js", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === TARGET) {
    return {
      url: LOCAL.href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
