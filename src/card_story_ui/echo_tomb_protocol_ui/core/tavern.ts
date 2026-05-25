/**
 * 酒馆环境桥接
 * 探测 TavernHelper、SillyTavern 可用能力，提供统一调用接口
 */

export interface TavernBridge {
  /** 获取最近 N 条消息 */
  getRecentMessages(count: number): SillyTavern.ChatMessage[];
  /** 获取最新消息 ID */
  getLastMessageId(): number;
  /** 获取当前聊天 ID */
  getCurrentChatId(): string;
}

let _bridge: TavernBridge | null = null;

export function initTavernBridge(): TavernBridge | null {
  // 能力探测: SillyTavern 全局对象
  if (typeof SillyTavern === 'undefined') {
    return null;
  }

  _bridge = {
    getRecentMessages(count: number): SillyTavern.ChatMessage[] {
      const messages = SillyTavern.getChatMessages();
      if (!messages || messages.length === 0) return [];
      return messages.slice(-count);
    },
    getLastMessageId(): number {
      return getLastMessageId();
    },
    getCurrentChatId(): string {
      return SillyTavern.getCurrentChatId();
    },
  };

  return _bridge;
}

export function getTavernBridge(): TavernBridge {
  if (!_bridge) throw new Error('[EchoTomb] TavernBridge not initialized');
  return _bridge;
}
