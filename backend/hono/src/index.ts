
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { Prisma, PrismaClient } from "@prisma/client";
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { WebhookEvent } from '@clerk/backend'
import { Webhook } from 'svix'

import { z } from 'zod'
// import { zValidate } from '@hono/zod-validate'



const app = new Hono()

const prisma = new PrismaClient();


const db = prisma


app.use('*', cors({ origin: 'http://localhost:3000' }))

    app.post("/webhook/clerk", clerkMiddleware(), (c) => {
        const SIGNING_SECRET = process.env.SIGNING_SECRET

        if (!SIGNING_SECRET) {
            throw new Error('Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local')
        }
        const wh = new Webhook(SIGNING_SECRET)
        const svix_id = c.req.header('svix-id')
        const svix_timestamp = c.req.header('svix-timestamp')
        const svix_signature = c.req.header('svix-signature')
        if (!svix_id || !svix_timestamp || !svix_signature) {
            return c.json({ message: 'Error: Missing Svix headers' }, {
                status: 400,
            })
        }
        const payload =  c.req.json()
        const body = JSON.stringify(payload)

        let evt: WebhookEvent

        try {
            evt = wh.verify(body, {
                'svix-id': svix_id,
                'svix-timestamp': svix_timestamp,
                'svix-signature': svix_signature,
            }) as WebhookEvent
        } catch (err) {
            console.error('Error: Could not verify webhook:', err)
            return c.json({ message: 'Error: Verification error' }, {
                status: 400,
            })
        }

        if (evt.type === 'user.created') {
            prisma.user.create({
                data: {
                    clerk_id: evt.data.id,
                }
            })
            return c.json({ message: 'User created successfully' }, {
                status: 200
            })
        }

        if (evt.type === 'user.deleted') {
            prisma.user.delete({
                where: {
                    clerk_id: evt.data.id,
                }
            })
            return c.json({ message: 'User deleted successfully' }, {
                status: 200
            })
        }
        return c.json({ message: 'Error: Invalid event type' }, {
            status: 400
        })
    })

    //Userのお気に入りを押した時の処理
    app.post('/favorite', async (c) => {
        try {
            // Clerk認証情報を取得
            const auth = getAuth(c)
            if (!auth?.userId) {
                return c.json({ error: 'Unauthorized' }, 401)
            }
    
            // `clerk_id` から `user_id` を取得
            const user = await prisma.user.findUnique({
                where: { clerk_id: auth.userId },
            })
    
            if (!user) {
                return c.json({ error: 'User not found' }, 404)
            }
    
            // リクエストボディを取得
            const body = await c.req.json()
            const { favorite_url } = body
    
            if (!favorite_url) {
                return c.json({ error: 'favorite_url is required' }, 400)
            }
    
            // お気に入りをデータベースに追加
            const favorite = await prisma.favorite.create({
                data: {
                    user_id: user.user_id,
                    favorite_url: String(favorite_url),
                },
            })
    
            return c.json({ message: 'Favorite added successfully', favorite })
        } catch (error) {
            console.error(error)
            return c.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 500)
        }
    })
    
    // お気に入りを削除
    app.delete('/favorite', async (c) => {
        try {
            // Clerk認証情報を取得
            const auth = getAuth(c)
            if (!auth?.userId) {
                return c.json({ error: 'Unauthorized' }, 401)
            }
    
            // `clerk_id` から `user_id` を取得
            const user = await prisma.user.findUnique({
                where: { clerk_id: auth.userId },
            })
    
            if (!user) {
                return c.json({ error: 'User not found' }, 404)
            }
    
            // リクエストボディを取得
            const body = await c.req.json()
            const { favorite_url } = body
    
            if (!favorite_url) {
                return c.json({ error: 'favorite_url is required' }, 400)
            }
    
            // お気に入りを削除
            const deletedFavorite = await prisma.favorite.deleteMany({
                where: {
                    user_id: user.user_id,
                    favorite_url: String(favorite_url),
                },
            })
    
            if (deletedFavorite.count === 0) {
                return c.json({ error: 'No matching favorite found' }, 404)
            }
    
            return c.json({ message: 'Favorite deleted successfully' })
        } catch (error) {
            console.error(error)
            return c.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 500)
        }
    })

   // Pythonサーバー(port:8000)をvalueそのままで叩く
   app.get("/recipe", async (c) => {
    try {
        // クエリパラメータを取得
        const queryParams = c.req.query();

        // 転送先のURL
        const targetServerUrl = "http://0.0.0.0:8000/api-endpoint";

        // タイムアウト処理を削除して、fetch がタイムアウトしないようにする
        const response = await fetch(`${targetServerUrl}?${new URLSearchParams(queryParams)}`, {
            method: 'GET',
        });

        console.log(`Response status: ${response.status}`);
        const responseData = await response.json();
        console.log("Response body:", responseData);

        // HTTPステータスコードのチェック
        if (!response.ok) {
            return c.json({ error: "Failed to fetch data from target server" }, 500);
        }

        // result フィールドの内容をパースする
        let parsedResult;
        try {
            let jsonString = (responseData as { result: string }).result;
            // Markdown のコードブロック内に JSON が埋め込まれている場合の処理
            if (jsonString.includes("```json")) {
                const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
                if (match) {
                    jsonString = match[1];
                } else {
                    throw new Error("JSON extraction failed");
                }
            }
            parsedResult = JSON.parse(jsonString);
        } catch (error) {
            console.error("Failed to parse response data:", responseData);
            return c.json({ error: "Failed to parse response data" }, 502);
        }

        // 必須プロパティの存在チェックと URL 抽出
        let fullUrl1, fullUrl2, fullUrl3;
        try {
            if (parsedResult.url1 && parsedResult.url2 && parsedResult.url3) {
                // 直接 url1, url2, url3 がある場合
                fullUrl1 = new URL(parsedResult.url1).href;
                fullUrl2 = new URL(parsedResult.url2).href;
                fullUrl3 = new URL(parsedResult.url3).href;
            } else if (Array.isArray(parsedResult.urls)) {
                // urls 配列がある場合
                const urls = parsedResult.urls;
                fullUrl1 = urls[0] ? new URL(urls[0]).href : "";
                fullUrl2 = urls[1] ? new URL(urls[1]).href : "";
                fullUrl3 = urls[2] ? new URL(urls[2]).href : "";
            } else {
                console.error("Invalid response format:", parsedResult);
                return c.json({ error: "Invalid response format from target server" }, 503);
            }
        } catch (error) {
            console.error("Failed to extract URL:", error);
            return c.json({ error: "Failed to extract URL from response data" }, 502);
        }

        console.log("Final response:", { url1: fullUrl1, url2: fullUrl2, url3: fullUrl3 });
        return c.json({ url1: fullUrl1, url2: fullUrl2, url3: fullUrl3 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Unexpected server error:", errorMessage);
        return c.json({ error: "Internal server error", details: errorMessage }, 503);
    }
});


    
    // app.get("/recipe", async (c) => {
    //     return c.json({
    //     url1: "https://cookpad.com/jp/recipes/17662797",
    //     url2: "https://mi-journey.jp/foodie/80782/",
    //     url3: "https://delishkitchen.tv/recipes/147726740259602726"
    //     });
    // });


export default {
    port: 8080,
    fetch: app.fetch
} 