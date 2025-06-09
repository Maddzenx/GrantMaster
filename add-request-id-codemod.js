/**
 * jscodeshift codemod: Add requestId to Next.js API routes
 * Usage: npx jscodeshift -t add-request-id-codemod.js pages/api/
 */
const { join, relative, dirname } = require('path');

function getImportPath(filePath) {
  // Try to resolve the correct relative path to lib/requestId
  const rel = relative(dirname(filePath), 'lib/requestId').replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : './' + rel;
}

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // 1. Add import if missing
  const importPath = getImportPath(file.path);
  const importDecl = j.importDeclaration(
    [j.importSpecifier(j.identifier('getRequestId'))],
    j.literal(importPath)
  );
  const hasImport = root.find(j.ImportDeclaration, {
    source: { value: importPath }
  }).size() > 0;
  if (!hasImport) {
    root.find(j.ImportDeclaration).at(0).insertBefore(importDecl);
  }

  // 2. Insert requestId assignment at top of handler
  root.find(j.FunctionDeclaration)
    .filter(path => path.node.id && path.node.id.name === 'handler')
    .forEach(path => {
      const body = path.node.body.body;
      const alreadyDeclared = body.some(
        stmt =>
          stmt.type === 'VariableDeclaration' &&
          stmt.declarations.some(
            d => d.id.type === 'Identifier' && d.id.name === 'requestId'
          )
      );
      if (!alreadyDeclared) {
        body.unshift(
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier('requestId'),
              j.callExpression(j.identifier('getRequestId'), [j.identifier('req')])
            )
          ])
        );
      }
    });

  // 3. Add requestId to log and error handler calls
  function addRequestIdToContext(call) {
    const args = call.node.arguments;
    if (args.length >= 2 && args[1].type === 'ObjectExpression') {
      const hasRequestId = args[1].properties.some(
        p => p.key && p.key.name === 'requestId'
      );
      if (!hasRequestId) {
        args[1].properties.push(
          j.property('init', j.identifier('requestId'), j.identifier('requestId'))
        );
      }
    }
  }
  root.find(j.CallExpression, {
    callee: { name: name => ['logInfo', 'logWarn', 'logError', 'handleApiError'].includes(name) }
  }).forEach(addRequestIdToContext);

  // 4. Add requestId to res.status().json() responses
  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: {
        type: 'CallExpression',
        callee: { type: 'MemberExpression', property: { name: 'status' } }
      },
      property: { name: 'json' }
    }
  }).forEach(path => {
    const args = path.node.arguments;
    if (
      args.length === 1 &&
      args[0].type === 'ObjectExpression' &&
      !args[0].properties.some(
        p => p.key && p.key.name === 'requestId'
      )
    ) {
      args[0].properties.push(
        j.property('init', j.identifier('requestId'), j.identifier('requestId'))
      );
    }
  });

  return root.toSource({ quote: 'single' });
};