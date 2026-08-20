import type { ImmersiveAudioTrack, ImmersiveTranscriptContent } from '../../../shared/contracts';

/**
 * Candidate editorial copy for the explicit local demo lane.
 *
 * This is not a production content source: the production manifest and its
 * rights/publication gate remain unchanged. PRODUCT must approve the copy and
 * provide the file-backed audio before this content can move to production.
 */
export interface DemoSceneContent {
  storyTitle: string;
  storyContent: string;
  transcript: ImmersiveTranscriptContent;
}

const THIEN_CAM_CONTENT: Readonly<Record<string, DemoSceneContent>> = {
  'thien-cam-boardwalk': {
    storyTitle: 'Mở đầu hành trình',
    storyContent:
      'Lối dạo ven biển mở ra nhịp bước thư thái giữa bờ cát thoai thoải và rặng thông xanh. Gió biển, tiếng sóng và tiếng thông reo tạo nên điểm khởi đầu nhẹ nhàng cho hành trình Thiên Cầm.',
    transcript: {
      id: 'transcript:bien-thien-cam:thien-cam-boardwalk:vi',
      locale: 'vi',
      title: 'Lối dạo Thiên Cầm',
      timingMode: 'plain',
      segments: [
        {
          id: 'thien-cam-boardwalk:vi:1',
          startMs: null,
          endMs: null,
          text: 'Chào mừng quý khách đến với lối dạo ven biển Thiên Cầm, nơi mở ra nhịp bước thư thái giữa bờ cát thoai thoải và rặng thông xanh mát.',
        },
        {
          id: 'thien-cam-boardwalk:vi:2',
          startMs: null,
          endMs: null,
          text: 'Từ cung đường này, làn gió biển và tiếng thông reo khởi đầu cho hành trình khám phá một vùng duyên hải thanh bình của Hà Tĩnh.',
        },
      ],
    },
  },
  'thien-cam-shore': {
    storyTitle: 'Bờ biển và truyền tích',
    storyContent:
      'Bờ biển Thiên Cầm gây ấn tượng bởi dải cát mịn, làn nước xanh và nhịp sóng hiền. Tên gọi Thiên Cầm thường được nhắc trong sử tích như hình ảnh Cung đàn trời; đây là truyền tích, không phải khẳng định niên đại lịch sử.',
    transcript: {
      id: 'transcript:bien-thien-cam:thien-cam-shore:vi',
      locale: 'vi',
      title: 'Bờ biển Thiên Cầm',
      timingMode: 'plain',
      segments: [
        {
          id: 'thien-cam-shore:vi:1',
          startMs: null,
          endMs: null,
          text: 'Bước chân xuống bờ biển Thiên Cầm, quý khách bắt gặp dải cát mịn thoai thoải và làn nước trong xanh màu ngọc bích.',
        },
        {
          id: 'thien-cam-shore:vi:2',
          startMs: null,
          endMs: null,
          text: 'Tên gọi Thiên Cầm trong sử tích gắn với hình tượng Cung đàn trời, một cách gọi giàu chất thơ cho thanh âm của gió và sóng biển.',
        },
        {
          id: 'thien-cam-shore:vi:3',
          startMs: null,
          endMs: null,
          text: 'Những lớp sóng trắng giữ lại nét thanh bình và vẻ đẹp tự nhiên của vùng duyên hải miền Trung.',
        },
      ],
    },
  },
  'thien-cam-lookout': {
    storyTitle: 'Tầm nhìn từ trên cao',
    storyContent:
      'Từ điểm ngắm, đường bờ cong hình cánh cung, núi Thiên Cầm, núi Đầu Voi và các đảo ngoài khơi tạo thành một khung cảnh giao hòa giữa non và nước.',
    transcript: {
      id: 'transcript:bien-thien-cam:thien-cam-lookout:vi',
      locale: 'vi',
      title: 'Điểm ngắm Thiên Cầm',
      timingMode: 'plain',
      segments: [
        {
          id: 'thien-cam-lookout:vi:1',
          startMs: null,
          endMs: null,
          text: 'Từ điểm ngắm này, cảnh sắc khu du lịch Thiên Cầm mở ra trước mắt du khách.',
        },
        {
          id: 'thien-cam-lookout:vi:2',
          startMs: null,
          endMs: null,
          text: 'Dải bờ biển uốn lượn, những triền núi và các đảo ngoài khơi tạo nên điểm nhìn rộng mở ra vịnh biển.',
        },
        {
          id: 'thien-cam-lookout:vi:3',
          startMs: null,
          endMs: null,
          text: 'Sự hòa quyện giữa núi rừng, bãi cát và chân trời biển lưu giữ vẻ đẹp giao hòa của vùng đất Hà Tĩnh.',
        },
      ],
    },
  },
};

export function getDemoSceneContent(
  destinationSlug: string,
  sceneId: string,
): DemoSceneContent | null {
  if (destinationSlug !== 'bien-thien-cam') {
    return null;
  }

  return THIEN_CAM_CONTENT[sceneId] ?? null;
}

export function createDemoThienCamAudioTracks(): readonly ImmersiveAudioTrack[] {
  return [
    {
      id: 'ambient:bien-thien-cam',
      type: 'ambient',
      label: 'Âm thanh không gian Thiên Cầm',
      src: null,
      rights: 'demo-only',
      readiness: 'unavailable',
      version: 'demo-gap-2026-08',
    },
    ...Object.entries(THIEN_CAM_CONTENT).map(([sceneId, content]) => ({
      id: `narration:bien-thien-cam:${sceneId}:vi`,
      type: 'narration' as const,
      label: content.transcript.segments.map((segment) => segment.text).join(' '),
      src: null,
      rights: 'demo-only' as const,
      locale: 'vi' as const,
      readiness: 'ready' as const,
      version: 'candidate-text-demo-speech-2026-08',
      voiceId: 'demo-speech-vi',
    })),
  ];
}

export const THIEN_CAM_DEMO_SCENE_IDS = Object.freeze(Object.keys(THIEN_CAM_CONTENT));
