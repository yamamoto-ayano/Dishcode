"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { UrlWindow } from "@/components/ui/urlWindow";

interface RecipeItem {
  title: string;
  image: string;
  url: string;
}

// メタデータを取得する関数
async function fetchMetadata(url: string): Promise<{ title: string; image: string }> {
  try {
    const res = await fetch(url);
    const html = await res.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "タイトルが取得できませんでした";

    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](.*?)["']/i);
    const image = ogImageMatch ? ogImageMatch[1].trim() : "";

    return { title, image };
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    return { title: "タイトル取得エラー", image: "" };
  }
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RecipeItem[]>([]);

  // クエリから url を取り出す（あなたの希望の形で）
  const url1 = typeof searchParams.get("url1") === "string" ? searchParams.get("url1") : undefined;
  const url2 = typeof searchParams.get("url2") === "string" ? searchParams.get("url2") : undefined;
  const url3 = typeof searchParams.get("url3") === "string" ? searchParams.get("url3") : undefined;

  useEffect(() => {
    const urls: string[] = [url1, url2, url3].filter((url): url is string => !!url);

    const fetchAll = async () => {
      const results = await Promise.all(
        urls.map(async (url) => {
          const { title, image } = await fetchMetadata(url);
          return { title, image, url };
        })
      );
      setItems(results);
    };

    if (urls.length > 0) {
      fetchAll();
    }
  }, [url1, url2, url3]);

  return (
    <div className="mt-16 flex flex-col gap-6 w-full justify-center items-center">
      <h1 className="text-2xl font-bold mb-4">おすすめレシピ</h1>
      <UrlWindow recipes={items} />
      <button
        onClick={() => window.location.href = "/"}
        className="w-60 h-20 bg-[#DD9004] text-3xl text-white rounded-2xl mb-12"
      >
        もう一回
      </button>
    </div>
  );
}