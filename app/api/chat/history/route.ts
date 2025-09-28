// app/api/chat/history/route.ts
import { NextResponse } from 'next/server';

// Pinata网关地址，用于获取IPFS内容
const PINATA_GATEWAY = "https://copper-solid-rhinoceros-625.mypinata.cloud/ipfs/";

/**
 * 递归获取完整的聊天历史记录
 * 从指定的CID开始，沿着previous_cid链向前追溯，获取所有历史消息
 * @param cid - 当前要获取的IPFS CID
 * @returns 返回按时间顺序排列的消息数组
 */
async function fetchFullHistory(cid: string | null): Promise<any[]> {
    // 如果CID为空，说明已经到达链条末端，返回空数组
    if (!cid) return [];
    
    try {
        // 从Pinata网关获取IPFS内容
        const response = await fetch(`${PINATA_GATEWAY}${cid}`);
        if (!response.ok) {
            console.error(`Failed to fetch CID from Pinata gateway: ${cid}`);
            return []; // 如果某个节点失败，中断链条
        }
        
        const data = await response.json();
        const currentMessage = data.message;
        
        // 递归获取前一条消息，然后拼接当前消息
        const previousMessages = await fetchFullHistory(data.previous_cid);
        
        return [...previousMessages, currentMessage];
    } catch (error) {
        console.error(`Error fetching or parsing CID ${cid}:`, error);
        return [];
    }
}

/**
 * GET /api/chat/history
 * 获取完整的聊天历史记录
 * 从URL参数中读取CID，然后递归获取所有历史消息
 * 支持查询参数: ?cid=QmYourCID
 */
export async function GET(request: Request) {
    try {
        // 从URL参数中获取CID
        const url = new URL(request.url);
        const cid = url.searchParams.get('cid');
        
        console.log("获取聊天历史请求，CID:", cid);
        
        // 如果没有提供CID，说明是新对话，返回空历史记录
        if (!cid) {
            console.log("没有提供CID，返回空历史记录");
            return NextResponse.json({ history: [] });
        }
        
        // 递归获取完整的历史记录
        const fullHistory = await fetchFullHistory(cid);
        
        console.log(`成功获取 ${fullHistory.length} 条历史消息`);
        
        // 返回历史记录和最新的CID
        return NextResponse.json({ 
            history: fullHistory, 
            latestCid: cid,
            messageCount: fullHistory.length
        });
    } catch (error) {
        console.error("GET /api/chat/history Error:", error);
        return NextResponse.json({ 
            error: "Failed to fetch chat history",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}