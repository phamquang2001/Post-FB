'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';


type PostItem = {
  rowIndex: number;
  description: string;
  image?: string;
  post_time?: string;
  status?: string;
  prompt_template?: string;
  tags?: string;
};

type PostResultItem = {
  rowIndex: number;
  status: 'Posted' | 'Failed' | 'Skipped' | string;
  postId?: string;
  error?: string;
};

type PostResult = {
  summary: {
    total: number;
    posted: number;
    failed: number;
    skipped: number;
  };
  results: PostResultItem[];
  error?: string;
};

export default function Home() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PostResult | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [error, setError] = useState('');
  const googleSheetApiUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_API_URL ;
  useEffect(() => {
    const savedUrl = localStorage.getItem('googleSheetUrl');
    if (savedUrl) setGoogleSheetUrl(savedUrl);
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      if (!googleSheetUrl) throw new Error('Chưa nhập URL Google Sheet');
      localStorage.setItem('googleSheetUrl', googleSheetUrl);
      const response = await axios.get(googleSheetUrl);
      setPosts(response.data.data || []);
      setResult(null);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu từ Google Sheet. Vui lòng kiểm tra URL.');
    } finally {
      setLoading(false);
    }
  };

  const runPostProcess = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/check-and-post');
      setResult(response.data);
      await fetchPosts();
    } catch (err) {
      console.error(err);
      setError('Lỗi khi chạy auto post. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSinglePost = async (post : PostItem) => {
    const confirmed = window.confirm('Bạn có chắc muốn đăng bài này?');
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      await axios.post('/api/post-to-facebook', {
        rowIndex: post.rowIndex,
        description: post.description,
        imageUrl: post.image,
        promptTemplate: post.prompt_template,
        tags: post.tags,
        googleSheetApiUrl: googleSheetUrl
      });
      await fetchPosts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Facebook Auto Poster</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-3">Cấu hình</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            placeholder="Google Sheet API URL"
            className="flex-1 p-2 border rounded"
          />
          <button 
            onClick={fetchPosts}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            Tải dữ liệu
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Danh sách bài viết chờ đăng</h2>
          <button 
            onClick={runPostProcess}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading || posts.length === 0}
          >
            Đăng tự động
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Không có bài viết nào hoặc chưa tải dữ liệu
          </div>
        ) : (
          <div className="border rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-100 text-black">
                <tr>
                  <th className="p-2 text-left">Mô tả</th>
                  <th className="p-2 text-left">Hình ảnh</th>
                  <th className="p-2 text-left">Thời gian đăng</th>
                  <th className="p-2 text-left">Trạng thái</th>
                  <th className="p-2 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2 max-w-xs">
                      {post?.description
                        ? post.description.length > 100
                          ? post.description.slice(0, 100) + '...'
                          : post.description
                        : <span className="text-gray-400">Không có mô tả</span>
                      }
                    </td>
                    <td className="p-2">
                    <td className="p-2">
                      {post.image ? (
                        <div className="max-w-[500px] flex flex-wrap gap-2">
                          {post.image
                            .split(',')
                            .map((url: string, idx: number) => (
                              <img
                                key={idx}
                                src={url.trim()}
                                alt={`Image ${idx + 1}`}
                                className="w-16 h-16 object-cover rounded"
                              />
                            ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">Không có</span>
                      )}
                    </td>
                    </td>
                    <td className="p-2">
                      {post.post_time
                        ? new Date(post.post_time).toLocaleString()
                        : 'Đăng ngay'}
                    </td>
                    <td className="p-2">{post.status || 'Pending'}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleSinglePost(post)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        disabled={loading}
                      >
                        Đăng ngay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Kết quả đăng bài</h2>
          {result.error ? (
            <div className="text-red-500">{result.error}</div>
          ) : (
            <div>
              <div className="mb-3">
                <strong>Tổng số:</strong> {result.summary.total} |
                <strong className="text-green-600 ml-2">Đăng thành công:</strong> {result.summary.posted} |
                <strong className="text-red-600 ml-2">Lỗi:</strong> {result.summary.failed} |
                <strong className="text-gray-500 ml-2">Bỏ qua:</strong> {result.summary.skipped}
              </div>
              {Array.isArray(result.results) && result.results.length > 0 && (
                <div className="border rounded overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Dòng</th>
                        <th className="p-2 text-left">Trạng thái</th>
                        <th className="p-2 text-left">ID bài đăng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results && result.results.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.rowIndex}</td>
                          <td className="p-2">
                            <span className={item.status === 'Posted' ? 'text-green-600' : 'text-red-600'}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-2">
                            {item.postId ? (
                              <a 
                                href={`https://facebook.com/${item.postId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {item.postId}
                              </a>
                            ) : (
                              <span className="text-gray-400">
                                {item.error || 'N/A'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
