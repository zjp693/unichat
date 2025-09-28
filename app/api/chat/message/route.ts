// app/api/chat/message/route.ts
import { NextResponse } from 'next/server';

/**
 * POST /api/chat/message
 * 发送新消息到IPFS
 * 接收前端发送的消息，上传到Pinata IPFS，返回新的CID
 * 完全基于Pinata存储，不使用Vercel KV
 */
export async function POST(request: Request) {
    try {
        // 解析请求体，获取新消息对象和前一个CID
        const { newMessageObject, previousCid } = await request.json();
        
        console.log("收到消息请求:", {
            messageId: newMessageObject?.id,
            hasContent: !!newMessageObject?.content,
            contentLength: newMessageObject?.content?.length,
            previousCid: previousCid,
            isEncrypted: newMessageObject?.isEncrypted
        });
        
        // 从环境变量获取Pinata JWT令牌
        const pinataJwt = process.env.PINATA_JWT;
        if (!pinataJwt) {
            console.error("PINATA_JWT环境变量未设置");
            return NextResponse.json({ 
                error: "PINATA_JWT environment variable is not set!",
                details: "请在 .env.local 文件中设置 PINATA_JWT 环境变量",
                setup: "参考 PINATA_SETUP.md 文件进行配置"
            }, { status: 500 });
        }
        
        // 构造要上传到IPFS的JSON对象
        const jsonToUpload = {
            message: newMessageObject,
            previous_cid: previousCid,
        };

        console.log("准备上传到Pinata的数据结构:", {
            hasMessage: !!jsonToUpload.message,
            hasPreviousCid: !!jsonToUpload.previous_cid,
            messageKeys: Object.keys(jsonToUpload.message || {})
        });

        // 调用Pinata API上传JSON到IPFS
        const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pinataJwt}`,
            },
            body: JSON.stringify(jsonToUpload),
        });
        
        console.log("Pinata API响应状态:", pinataResponse.status);
        
        // 检查Pinata API响应状态
        if (!pinataResponse.ok) {
            const errorText = await pinataResponse.text();
            console.error("Pinata API错误详情:", {
                status: pinataResponse.status,
                statusText: pinataResponse.statusText,
                errorBody: errorText
            });
            throw new Error(`Pinata API Error (${pinataResponse.status}): ${errorText}`);
        }

        // 解析Pinata响应，获取新的IPFS哈希
        const data = await pinataResponse.json();
        console.log("Pinata响应数据:", data);
        
        const newCid = data.IpfsHash;
        if (!newCid) {
            throw new Error("Pinata响应中没有返回IpfsHash");
        }

        console.log("消息已成功上传到Pinata，新CID:", newCid);

        // 返回成功响应和新的CID（前端会将其保存到localStorage）
        return NextResponse.json({ success: true, newCid: newCid });
    } catch (error) {
        console.error("POST /api/chat/message 详细错误:", {
            error: error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({ 
            error: "Failed to pin message to Pinata",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}