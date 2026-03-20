import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Course'
    const type = searchParams.get('type') || 'course'
    const courseId = searchParams.get('courseId')

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            backgroundImage: 'linear-gradient(45deg, #1a1a1a 0%, #2d2d2d 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
            }}
          />
          
          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            {/* Type Badge */}
            <div
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {type}
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: title.length > 50 ? '48px' : '64px',
                fontWeight: 'bold',
                color: 'white',
                margin: '0 0 20px 0',
                lineHeight: 1.2,
                maxWidth: '800px',
                textAlign: 'center',
              }}
            >
              {title}
            </h1>

            {/* Course ID if provided */}
            {courseId && (
              <div
                style={{
                  fontSize: '20px',
                  color: '#9ca3af',
                  marginTop: '20px',
                }}
              >
                Course ID: {courseId}
              </div>
            )}

            {/* Bottom Branding */}
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                right: '40px',
                fontSize: '18px',
                color: '#6b7280',
                fontWeight: '500',
              }}
            >
              Making IIITM great again, one doc at a time!
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}
