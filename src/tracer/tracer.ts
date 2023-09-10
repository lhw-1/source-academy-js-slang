import * as es from 'estree'

import { Context } from '../types'
import { literal, mutateToCallExpression } from '../utils/astCreator'
import { simple } from '../utils/walkers'

const acorn = require('acorn')

// const parseArg = (arg: Object): any => {
//   if (arg['type'] === 'Literal') {
//     return arg['raw']
//   } else if (arg['type'] === 'Identifier') {
//     return arg['name']
//   } else {
//     return 'undefined'
//   }
// }

export const applyTracer = (program: es.Program, context: Context) => {
  simple(program, {
    CallExpression(node: es.CallExpression) {
      // Create a ES Tree version of the tracer
      const tracerNode = acorn.parse(
        '((func_name, args_len, func, ...args) => { \
          display(func_name, "Function:"); \
          for (let j = 0; j < args_len; j++) { \
            let k = args[j]; \
            display(k, "Arg:"); \
          } \
          display(""); \
          return func(...args); \
        })(0);'
      ).body[0]

      // Parse function name into a string
      const trace_func_name = literal(node.callee['name'] || 'Anonymous')

      // Parse function arguments into a string
      // let args_name = ''
      // for (let i = 0; i < node.arguments.length; i++) {
      //   args_name += parseArg(node.arguments[i])
      //   args_name += ', '
      // }
      const trace_args_len = literal(node.arguments.length)

      // Create a tracer node
      tracerNode.expression.arguments = [
        trace_func_name,
        trace_args_len,
        node.callee,
        ...node.arguments
      ]

      // Replace node with tracerNode
      mutateToCallExpression(node, tracerNode.expression.callee, tracerNode.expression.arguments)
    }
  })

  return program
}
