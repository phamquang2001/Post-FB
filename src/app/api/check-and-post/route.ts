import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    // Lấy Google Sheet API URL từ biến môi trường
    const googleSheetApiUrl = process.env.GOOGLE_SHEET_API_URL;
    
    if (!googleSheetApiUrl) {
      return NextResponse.json(
        { message: 'Google Sheet API URL not configured' },
        { status: 400 }
      );
    }
    console.log("321a321", googleSheetApiUrl)
    // Lấy danh sách bài viết chờ đăng từ Google Sheet
    const response = await axios.get(googleSheetApiUrl);
    console.log("1111", response)
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
      // Kiểm tra thời gian đăng
      const postTime = post.post_time ? new Date(post.post_time) : null;
      const now = new Date();
      
      // Đăng bài nếu không có thời gian lên lịch hoặc đã đến thời gian
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
        } catch (error: any) {
          results.push({
            rowIndex: post.rowIndex,
            status: 'Failed',
            error: error.response?.data || error.message
          });
          
          failedCount++;
        }
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
  } catch (error: any) {
    console.error('Error checking and posting:', error);
    
    return NextResponse.json(
      { 
        message: 'Error checking and posting', 
        error: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}
