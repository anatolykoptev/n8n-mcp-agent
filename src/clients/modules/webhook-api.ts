/**
 * @module clients/modules/webhook-api
 * @description Webhook execution API
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nWorkflow } from '../../types/n8n.js';
import { DEFAULT_TIMEOUT_MS } from '../../constants/api.js';

/** Webhook execution options */
export interface WebhookExecuteOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
}

/** Webhook execution response */
export interface WebhookResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

/** Webhook info */
export interface WebhookInfo {
  webhookUrl: string;
  webhookPath: string;
  httpMethod: string;
}

/**
 * Webhook execution API
 */
export class WebhookApi {
  constructor(
    private readonly http: HttpClient,
    private readonly getBaseUrl: () => string
  ) {}

  /**
   * Execute a workflow via its webhook URL
   */
  async execute(webhookPath: string, options: WebhookExecuteOptions = {}): Promise<WebhookResponse> {
    const { method = 'POST', data, headers = {}, timeout = DEFAULT_TIMEOUT_MS } = options;

    const baseUrlObj = new URL(this.getBaseUrl());
    const webhookUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/webhook/${webhookPath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(webhookUrl, fetchOptions);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: unknown;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        status: response.status,
        data: responseData,
        headers: responseHeaders,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get webhook information from a workflow
   */
  getInfo(workflow: N8nWorkflow): WebhookInfo | null {
    const webhookNode = workflow.nodes?.find(
      (node) =>
        node.type === 'n8n-nodes-base.webhook' || node.type === '@n8n/n8n-nodes-langchain.webhook'
    );

    if (!webhookNode) {
      return null;
    }

    const path = webhookNode.parameters?.path as string | undefined;
    const httpMethod = (webhookNode.parameters?.httpMethod as string) || 'POST';

    if (!path) {
      return null;
    }

    const baseUrlObj = new URL(this.getBaseUrl());
    const webhookUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/webhook/${path}`;

    return {
      webhookUrl,
      webhookPath: path,
      httpMethod,
    };
  }
}
