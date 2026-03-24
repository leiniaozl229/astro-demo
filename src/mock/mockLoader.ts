export interface MockResponse {
  role: 'assistant' | 'user';
  content: string;
}

export interface MockResponse {
  role: 'assistant' | 'user';
  content: string;
}

// 使用 Vite 的 import.meta.glob 导入所有 md 文件
const mockFiles = import.meta.glob<{ default: string }>('./**/*.md', { as: 'raw' });

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
 * 加载所有 mock 回复（按编号顺序）
 */
export async function loadAllMockResponses(): Promise<MockResponse[]> {
  const files = [
    './1-planner-response.md',
    './2-dau-discovery.md',
    './3-dau-codegen.md'
  ];

  const responses: MockResponse[] = [];

  for (const file of files) {
    try {
      const loader = mockFiles[file];
      if (loader) {
        const mdContent = await loader();
        const response = parseMockResponse(mdContent.default || mdContent);
        if (response) {
          responses.push(response);
        }
      }
    } catch (error) {
      console.error(`Error loading mock response ${file}:`, error);
    }
  }

  return responses;
}
