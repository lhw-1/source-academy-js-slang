import * as es from 'estree'

import { Context } from '../types'
import { literal, mutateToCallExpression } from '../utils/astCreator'
import { simple } from '../utils/walkers'

const acorn = require('acorn')

/* 
This function traverses the AST bottom-to-top and transforms all BinaryExpression nodes into CallExpression nodes.
This allows us to treat both binary operations and function call expressions in the same manner.

We also add in a flag ("b2c") and the operator itself to make tracing easier.
*/ 
const transformBinaryExpressionsToCallExpressions = (program: es.Program, context: Context) => {
  simple(program, {
    BinaryExpression(node: es.BinaryExpression) {
      const binary_fn = acorn.parse('(x, y, flag, op) => x ' + node.operator + ' y').body[0].expression
      const args = [node.left, node.right, literal("b2c"), literal(node.operator)]
      mutateToCallExpression(node, binary_fn, args)
    }
  })
  return program;
}

/*
This function traverses the AST bottom-to-top and traces all CallExpression nodes.
It first transforms a tracing function into an AST node.

The tracing function is of this form:
(func, args) => { trace(func, args); func(args); }

This allows the tracing to happen as a side effect, while still returning the original result of the expression,
ensuring that even when the tracing occurs, the program flow is uninterrupted.

We then input the callee (the function) of the tracing function and our custom arguments into the original CallExpression
node, essentially "injecting" the tracing logic.
*/
export const applyTracer = (program: es.Program, context: Context) => {
  const transformedProgram = transformBinaryExpressionsToCallExpressions(program, context);
  simple(transformedProgram, {
    CallExpression(node: es.CallExpression) {
      if (node.arguments.length === 4 && node.arguments[2]['value'] === 'b2c') {

        // Create a ES Tree version of the binary expression tracer
        const opTracerNode = acorn.parse(
          '((op_name, func, ...args) => { \
            display(op_name, "Operation ::"); \
            let k = args[0]; \
            let j = args[1]; \
            display(k, "Left ::"); \
            display(j, "Right ::"); \
            display("----------------"); \
            return func(...args); \
          })(0);'
        ).body[0]

        // Parse operator name into a literal
        const op_func_name = node.arguments[3]

        // Create a tracer node
        opTracerNode.expression.arguments = [
          op_func_name,
          node.callee,
          ...node.arguments
        ]

        // Replace node with opTracerNode
        mutateToCallExpression(node, opTracerNode.expression.callee, opTracerNode.expression.arguments)

      } else {

        // Create a ES Tree version of the call expression tracer
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
      }
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
