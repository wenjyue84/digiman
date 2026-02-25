import { toolRegistry } from './registry';
import { Request, Response } from 'express';

export function createMCPHandler() {
  return async (req: Request, res: Response) => {
    try {
      const { method, params, id, jsonrpc } = req.body;

      if (!method) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: missing method'
          },
          id: null
        });
        return;
      }

      let result;
      if (method === 'tools/list') {
        result = {
          tools: toolRegistry.listTools()
        };
      } else if (method === 'tools/call') {
        const { name, arguments: args } = params || {};
        result = await toolRegistry.executeTool(name, args);
      } else if (method === 'initialize') {
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'digiman',
            version: '1.0.0'
          }
        };
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
          id: id || null
        });
        return;
      }

      res.json({
        jsonrpc: jsonrpc || '2.0',
        result,
        id: id || null
      });
    } catch (error: any) {
      console.error('MCP handler error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`
        },
        id: req.body.id || null
      });
    }
  };
}
