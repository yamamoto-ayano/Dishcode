"use client";

import { useState } from "react";
import { UrlWindow } from "@/components/ui/urlWindow";

type Recipe = {
  title: string;
  image: string;
  url: string;
};

export default function Page() {
  const [inputUrl, setInputUrl] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Hono サーバーの API に対して URL のメタデータを取得
  const handleSearch = async () => {
    if (!inputUrl) {
      alert("URLを入力してください");
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: inputUrl }),
      });
      if (!res.ok) {
        throw new Error("メタデータ取得に失敗しました");
      }
      const data: Recipe = await res.json();
      // 取得したレシピ情報をリストに追加
      setRecipes((prev) => [...prev, data]);
      setInputUrl("");
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    }
  };

  return (
    <div className="mt-16 flex flex-col gap-6 w-full justify-center items-center px-4">
  <h1 className="text-2xl font-bold mb-4">保存したいレシピ</h1>
  {/* URL入力欄と検索ボタン */}
  <div className="flex gap-2 mb-4 w-full max-w-lg">
    <input
      type="text"
      placeholder="URLを入力"
      value={inputUrl}
      onChange={(e) => setInputUrl(e.target.value)}
      className="flex-1 border p-2 pl-10 rounded-full"
    />
    <button
      onClick={handleSearch}
      className="flex-none w-24 sm:w-40 bg-[#DD9004] text-xl text-white rounded-2xl"
    >
      検索
    </button>
      </div>
      {/* 取得したレシピ情報を UrlWindow コンポーネントで表示 */}
      <UrlWindow recipes={recipes} />
    </div>
  );
}
