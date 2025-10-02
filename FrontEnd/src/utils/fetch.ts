/**
 * 異步呼叫api, 只可用響應體為 json 的 api
 * @param api 要呼叫的api
 * @param token 可選的認證token
 * @returns json 結果
 */
export async function asyncGet(api: string, token?: string):Promise<any>{
    try {
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        // 如果有token，添加到Authorization header
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res: Response = await fetch(api, {
            method: 'GET',
            headers,
            credentials: 'include'
        });
        
        try {
            return await res.json()
        } catch (error) {
            console.error('JSON parsing error:', error);
            return { code: 500, message: '伺服器回應格式錯誤', body: null };
        }
    } catch (error) {
        return error
    }
}

export async function asyncPost(api: string, body: {} | FormData) {
    const headers: HeadersInit = {};

    // 只有當 body 不是 FormData 時才設置 Content-Type
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = "application/json";
    }

    console.log('發送 POST 請求到:', api);
    console.log('請求頭:', headers);
    console.log('請求體:', body);

    const res: Response = await fetch(api, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
        mode: "cors"
    });
    
    console.log('響應狀態:', res.status);
    console.log('響應頭:', Object.fromEntries(res.headers.entries()));
    
    try {
        const data = await res.json();
        console.log('響應數據:', data);
        return data;
    } catch (error) {
        console.error('JSON parsing error:', error);
        return { code: 500, message: '伺服器回應格式錯誤', body: null };
    }
}

export async function asyncPatch(api: string, body: {} | FormData) {
    const headers: HeadersInit = {
        'Content-Type': "application/json"
    };

    const res: Response = await fetch(api, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
        mode: "cors"
    });
    
    try {
        return await res.json();
    } catch (error) {
        console.error('JSON parsing error:', error);
        return { code: 500, message: '伺服器回應格式錯誤', body: null };
    }
}

export async function asyncDelete(api: string) {
    const headers: HeadersInit = {
        'Content-Type': "application/json"
    };

    const res: Response = await fetch(api, {
        method: 'DELETE',
        credentials: 'include',
        headers,
        mode: "cors"
    });
    
    try {
        return await res.json();
    } catch (error) {
        console.error('JSON parsing error:', error);
        return { code: 500, message: '伺服器回應格式錯誤', body: null };
    }
}