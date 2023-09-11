import * as es from 'estree'

import { Context } from '../types'
import { literal, mutateToCallExpression } from '../utils/astCreator'
import { simple } from '../utils/walkers'

const acorn = require('acorn')

export const applyTracer = (program: es.Program, context: Context) => {
  simple(program, {
    BinaryExpression(node: es.BinaryExpression) {
      // Create a ES Tree version of the tracer
      const tracerNode = acorn.parse(
        '((op, op_func, node_left, node_right, left, right) => { \
          display(op, "Operator ::"); \
          display(left, "Left ::"); \
          display(right, "Right ::"); \
          display("----------------"); \
          return op_func(node_left, node_right); \
        })(0);'
      ).body[0]

      // Mapping for operators to functions
      const op_func_map = new Map<string, any>([
        ["+", (x: number, y: number) => x + y],
        ["-", (x: number, y: number) => x - y],
        ["*", (x: number, y: number) => x * y],
        ["/", (x: number, y: number) => x / y],
        ["%", (x: number, y: number) => x % y],
        ["<", (x: number, y: number) => x < y],
        ["<=", (x: number, y: number) => x <= y],
        [">", (x: number, y: number) => x > y],
        [">=", (x: number, y: number) => x >= y],
        ["===", (x: boolean, y: boolean) => x === y],
        ["!==", (x: boolean, y: boolean) => x !== y],
      ]);

      // Parse left / right into names
      // const parse_param = 
      console.log(node)

      // Parse function name into a string
      const trace_op = literal(node.operator)
      const trace_left = literal(node.left['raw'] || node.left['name'])
      const trace_right = literal(node.right['raw'] || node.right['name'])

      const trace_op_func = op_func_map.get(node.operator)

      // Create a tracer node
      tracerNode.expression.arguments = [
        trace_op,
        trace_op_func,
        node.left,
        node.right,
        trace_left,
        trace_right,
      ]

      console.log(trace_op)
      console.log(trace_left)
      console.log(trace_right)

      // Replace node with tracerNode
      // mutateToCallExpression(node, tracerNode.expression.callee, tracerNode.expression.arguments)
    },
    CallExpression(node: es.CallExpression) {
      // Create a ES Tree version of the tracer
      const tracerNode = acorn.parse(
        '((func_name, args_len, func, ...args) => { \
          display(func_name, "Function ::"); \
          for (let j = 0; j < args_len; j++) { \
            let k = args[j]; \
            display(k, "Arg ::"); \
          } \
          display("----------------"); \
          return func(...args); \
        })(0);'
      ).body[0]

      // Parse function name into a string
      const trace_func_name = literal(node.callee['name'] || 'Anonymous')

      // Parse length of arguments
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
    },
    // binaryExpression()
  })

  return program
}
