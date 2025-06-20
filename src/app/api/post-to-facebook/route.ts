import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import axios from 'axios';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: process.env.OPENAI_BASE_URL!, // <--- Quan trọng
  });

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();

    const {
      rowIndex,
      description,
      imageUrl,
      promptTemplate,
      tags,
      googleSheetApiUrl,
    } = requestBody;
    const imageUrls: string[] = imageUrl
    ? imageUrl.split(',').map((url : string) => url.trim()).filter(Boolean)
    : [];
    console.log("vcxvxc", imageUrls)
    const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
    const pageId = process.env.PAGE_ID;

    if (!description || !pageAccessToken || !pageId || !googleSheetApiUrl || !rowIndex) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const defaultPrompt = `Viết lại nội dung sau thành một bài đăng Facebook hấp dẫn, ngắn gọn và dễ đọc. Thêm emoji phù hợp. Giữ nguyên thông tin quan trọng: 

${description}

${tags ? `Hãy đảm bảo đưa các hashtag này vào cuối bài viết: ${tags}` : ''}`;

    const finalPrompt = promptTemplate || defaultPrompt;

    // ✅ Dùng GPT-3.5-Turbo
    const completion = await openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `
                Viết 1 bài đăng Facebook bán hàng theo phong cách cợt nhả, hài hước kiểu Gen Z. Thêm emoji phù hợp, văn nói dí dỏm, chơi chữ nhẹ. Giữ nội dung dễ hiểu cho người đọc:
                - Làm người ta cười
                - Nhưng vẫn rõ ràng sản phẩm là gì
                - Xuống dòng để tạo điểm nhấn dễ nhìn, Kêu gọi hành động (mua hàng, nhấn vào link (tôi sẽ cung cấp link sản phẩm)). nếu có link mới hiển thị không phải kiểu  (Link sản phẩm: [link sản phẩm]) rất không ổn.
                Output: Nội dung Facebook post.`
          },
          {
            role: "user",
            content: finalPrompt
          }
        ]
      });
      

    const optimizedContent = completion.choices[0].message?.content?.trim() || '...';

    const postData: {
        message: string;
        attached_media?: { media_fbid: string }[];
      } = { message: optimizedContent };
      
      if (imageUrls.length > 0) {
        const uploadedImages = await Promise.all(
          imageUrls.map(async (url) => {
            const uploadRes = await axios.post(
              `https://graph.facebook.com/v17.0/${pageId}/photos`,
              null,
              {
                params: {
                  url,
                  published: false,
                  access_token: pageAccessToken,
                },
              }
            );
            return { media_fbid: uploadRes.data.id };
          })
        );
        postData.attached_media = uploadedImages;
      }
    
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${pageId}/feed`,
      postData,
      {
        params: {
          access_token: pageAccessToken,
          published: true
        }
      }
    );

    await axios.post(googleSheetApiUrl, {
      rowIndex: rowIndex,
      status: "Posted",
      postId: response.data.id,
      finalContent: optimizedContent
    });

    return NextResponse.json({
      success: true,
      postId: response.data.id,
      optimizedContent: optimizedContent
    });

  } catch{
    try {
      const requestBody = await request.json();
      if (requestBody.rowIndex && requestBody.googleSheetApiUrl) {
        await axios.post(requestBody.googleSheetApiUrl, {
          rowIndex: requestBody.rowIndex,
          status: "Failed",
          finalContent: ``
        });
      }
    } catch (updateError) {
      console.error('Error updating Google Sheet:', updateError);
    }

    return NextResponse.json(
      {
        message: 'Error processing request',
        error: ''
      },
      { status: 500 }
    );
  }
}
