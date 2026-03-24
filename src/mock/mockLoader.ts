import { Message } from '../types/chat';

export interface MockResponse {
  role: 'assistant' | 'user';
  content: string;
}

/**
 * 从 md 文件内容解析 mock 回复
 * 格式：
 * role: assistant
 * content:
 * 内容...
 */
export function parseMockResponse(mdContent: string): MockResponse | null {
  const roleMatch = mdContent.match(/^role:\s*(assistant|user)\s*/im);
  const contentMatch = mdContent.match(/^content:\s*([\s\S]*)$/im);

  if (roleMatch && contentMatch) {
    return {
      role: roleMatch[1] as 'assistant' | 'user',
      content: contentMatch[1].trim()
    };
  }

  return null;
}

/**
 * 动态加载单个 md 文件
 */
export async function loadMockResponse(filename: string): Promise<MockResponse | null> {
  try {
    const response = await fetch(`/mock/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}`);
    }
    const mdContent = await response.text();
    return parseMockResponse(mdContent);
  } catch (error) {
    console.error(`Error loading mock response ${filename}:`, error);
    return null;
  }
}

/**
 * 加载所有 mock 回复（按编号顺序）
 */
export async function loadAllMockResponses(): Promise<MockResponse[]> {
  const files = [
    '1-planner-response.md',
    '2-dau-discovery.md',
    '3-dau-codegen.md'
  ];

  const responses: MockResponse[] = [];

  for (const file of files) {
    const response = await loadMockResponse(file);
    if (response) {
      responses.push(response);
    }
  }

  return responses;
}
