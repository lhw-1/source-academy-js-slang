import * as es from 'estree'

import { Context } from '../types'
import { literal, mutateToCallExpression } from '../utils/astCreator'
import { simple } from '../utils/walkers'

const acorn = require('acorn')

const transformBinaryExpressionsToCallExpressions = (program: es.Program, context: Context) => {
  simple(program, {
    BinaryExpression(node: es.BinaryExpression) {
      // Transform into call expressions
    }
  })
  return program;
}

export const applyTracer = (program: es.Program, context: Context) => {
  const transformedProgram = transformBinaryExpressionsToCallExpressions(program, context);
  simple(transformedProgram, {

    CallExpression(node: es.CallExpression) {
      // Create a ES Tree version of the tracer
      const expTracerNode = acorn.parse(
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
      expTracerNode.expression.arguments = [
        trace_func_name,
        trace_args_len,
        node.callee,
        ...node.arguments
      ]

      // Replace node with expTracerNode
      mutateToCallExpression(node, expTracerNode.expression.callee, expTracerNode.expression.arguments)
    },
  });

  return program
}

    // BinaryExpression(node: es.BinaryExpression) {
      // Create a ES Tree version of the tracer
      // const opTracerNode = acorn.parse(
      //   '((op, left, right, node_op_func, node_left, node_right) => { \
      //     display(op, "Operator ::"); \
      //     display(left, "Left ::"); \
      //     display(right, "Right ::"); \
      //     display("----------------"); \
      //     return node_op_func(node_left, node_right); \
      //   })(0);'
      // ).body[0]
      

      // Mapping for operators to functions
      // const op_func_map = new Map<string, string>([
      //   ["+", "(x, y) => x + y"],
      //   ["-", "(x, y) => x - y"],
      //   ["*", "(x, y) => x * y"],
      //   ["/", "(x, y) => x / y"],
      //   ["%", "(x, y) => x % y"],
      //   ["<", "(x, y) => x < y"],
      //   ["<=", "(x, y) => x <= y"],
      //   [">", "(x, y) => x > y"],
      //   [">=", "(x, y) => x >= y"],
      //   ["===", "(x, y) => x === y"],
      //   ["!==", "(x, y) => x !== y"]
      // ]);
      // console.log(op_func_map.get(node.operator))

    //   const opTracerNode = acorn.parse(
    //     '((op, node_op_func) => { \
    //       display(op, "Operator ::"); \
    //       display("----------------"); \
    //       return node_op_func; \
    //     })(0);'
    //   ).body[0]

    //   // Parse function name into a string
    //   const trace_op = literal(node.operator)
    //   const node_op_func = binaryExpression(node.operator, node.left, node.right)
      
    //   // Create a tracer node
    //   opTracerNode.expression.arguments = [
    //     trace_op,
    //     node_op_func,
    //   ]

    //   // Replace node with opTracerNode
    //   mutateToCallExpression(node, opTracerNode.expression.callee, opTracerNode.expression.arguments)
    // },
