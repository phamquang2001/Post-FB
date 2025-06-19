import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    const googleSheetApiUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_API_URL;
    
    if (!googleSheetApiUrl) {
      return NextResponse.json(
        { message: 'Google Sheet API URL not configured' },
        { status: 400 }
      );
    }
    const response = await axios.get(googleSheetApiUrl);
    // const posts = response.data.data || [];
    let posts = [];
    
    // Lấy danh sách bài viết chờ đăng từ Google Sheet với xử lý lỗi
    try {
      const response = await axios.get(googleSheetApiUrl);
      console.log("Response from Google Sheet API:", response.data);
      
      // Kiểm tra dữ liệu trả về có đúng định dạng không
      if (response.data && response.data.success === true) {
        posts = response.data.data || [];
      } else {
        console.error("Invalid response format from Google Sheet API:", response.data);
        return NextResponse.json(
          { message: 'Invalid response from Google Sheet API', data: response.data },
          { status: 500 }
        );
      }
    } catch (googleSheetError) {
      console.error("Error fetching data from Google Sheet:", googleSheetError);
      return NextResponse.json(
        { 
          message: 'Error fetching data from Google Sheet', 
        },
        { status: 500 }
      );
    }
    // Kiểm tra xem có bài viết nào chờ đăng không
    if (posts.length === 0) {
      return NextResponse.json({ message: 'No pending posts' });
    }
    
    // Lấy URL của API đăng bài
    const apiUrl = new URL('/api/post-to-facebook', request.url).toString();
    
    // Khởi tạo biến đếm
    let postedCount = 0;
    let failedCount = 0;
    const results = [];
    
    // Xử lý từng bài viết
    for (const post of posts) {
  const postTime = post.post_time ? new Date(post.post_time) : null;
  const now = new Date();

  if (!postTime || postTime <= now) {
    try {
      const postResponse = await axios.post(apiUrl, {
        rowIndex: post.rowIndex,
        description: post.description,
        imageUrl: post.image,
        promptTemplate: post.prompt_template,
        tags: post.tags,
        googleSheetApiUrl: googleSheetApiUrl
      });

      results.push({
        rowIndex: post.rowIndex,
        status: 'Posted',
        postId: postResponse.data.postId
      });

      postedCount++;
    } catch {
      results.push({
        rowIndex: post.rowIndex,
        status: 'Failed',
        error: ''
      });

      failedCount++;
    }

    // ❗Chỉ đăng 1 bài rồi thoát vòng lặp
    break;
  }
}

    
    return NextResponse.json({
      success: true,
      summary: {
        total: posts.length,
        posted: postedCount,
        failed: failedCount,
        skipped: posts.length - postedCount - failedCount
      },
      results: results
    });
  } catch  {
    
    return NextResponse.json(
      { 
        message: 'Error checking and posting', 
        error: ''
      },
      { status: 500 }
    );
  }
}
