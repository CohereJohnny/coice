import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageId, message, imageUrl } = await request.json();

    if (!imageId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: imageId and message' },
        { status: 400 }
      );
    }

    // TODO: Replace this with actual VLLM integration
    // For now, return a simulated response based on the question
    let response = '';
    
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('object') || messageLower.includes('see')) {
      response = "I can see several objects in this image including what appears to be pets (a dog and a cat based on the image context). The image shows clear details and good composition.";
    } else if (messageLower.includes('color')) {
      response = "The image features warm, natural colors. I can see browns, golds, and other earth tones that create a pleasant, cozy atmosphere.";
    } else if (messageLower.includes('describe') || messageLower.includes('scene')) {
      response = "This appears to be a heartwarming image showing pets together. The composition is well-balanced and the lighting creates a pleasant, inviting scene. The subjects appear relaxed and comfortable.";
    } else if (messageLower.includes('people') || messageLower.includes('animal')) {
      response = "I can see what appears to be animals in this image - specifically pets that look like they're posing together. No people are visible in the frame.";
    } else if (messageLower.includes('mood') || messageLower.includes('atmosphere')) {
      response = "The mood of this image is warm, friendly, and endearing. It has a cozy, homey atmosphere that suggests companionship and comfort.";
    } else if (messageLower.includes('text')) {
      response = "I can see what appears to be a watermark or text overlay in the image, but the main focus is on the subjects rather than any readable text content.";
    } else {
      response = `Thank you for your question about this image. While I can process your request "${message}", I'm currently running in demo mode. The full VLLM vision model integration will provide more detailed and accurate analysis of image content, including object detection, scene understanding, and contextual questioning.`;
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return NextResponse.json({
      success: true,
      response,
      imageId,
      timestamp: new Date().toISOString(),
      model: 'demo-placeholder'
    });

  } catch (error) {
    console.error('Image chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 